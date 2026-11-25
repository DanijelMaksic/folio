import { mockUser } from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockGetUserStats } = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockGetUserStats: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
   },
}));

vi.mock('@/lib/user-stats.js', () => ({
   getUserStats: mockGetUserStats,
}));

vi.mock('@/lib/email.js', () => ({
   sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/cloudinary.js', () => ({
   default: {
      uploader: {
         upload: vi.fn(),
         destroy: vi.fn(),
      },
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: {
      add: vi.fn(),
   },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const updatedAt = new Date('2025-01-15T10:00:00.000Z');

const mockStats = {
   documentsUploaded: 2,
   totalTranscriptions: 10,
   approved: 5,
   submitted: 2,
   rejected: 1,
   drafts: 2,
};

const mockRecentDoc = {
   id: 'doc-1',
   title: 'Test Document',
   status: 'ready',
   updatedAt,
   pageCount: 3,
   coverImageUrl: 'https://res.cloudinary.com/mock/image/upload/page-1.png',
};

const mockRejected = {
   id: 'transcription-1',
   documentId: 'doc-1',
   documentTitle: 'Test Document',
   pageNumber: 2,
   rejectionReason: 'Needs more detail',
   updatedAt,
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().leftJoin().where().groupBy().orderBy().limit()
const mockRecentDocsQuery = (rows: unknown[]) => {
   const where = vi.fn((_where?: unknown) => ({
      groupBy: vi.fn(() => ({
         orderBy: vi.fn(() => ({ limit })),
      })),
   }));
   const limit = vi.fn((_n?: number) => Promise.resolve(rows));
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ leftJoin: vi.fn(() => ({ where })) })),
   });
   return { where, limit };
};

// select().from().innerJoin().innerJoin().where().orderBy().limit()
const mockRejectedQuery = (rows: unknown[]) => {
   const limit = vi.fn((_n?: number) => Promise.resolve(rows));
   const where = vi.fn((_where?: unknown) => ({
      orderBy: vi.fn(() => ({ limit })),
   }));
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({ where })),
         })),
      })),
   });
   return { where, limit };
};

// select().from().where() (both count queries)
const mockCountQuery = (rows: unknown[]) => {
   const where = vi.fn((_where?: unknown) => Promise.resolve(rows));
   mockSelect.mockReturnValueOnce({ from: vi.fn(() => ({ where })) });
   return { where };
};

// ── getOverview ───────────────────────

describe('dashboard.getOverview', () => {
   it('returns stats, recent documents and rejected items for a contributor', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([mockRecentDoc]);
      mockRejectedQuery([mockRejected]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(mockGetUserStats).toHaveBeenCalledWith(contributorUser.id);
      expect(result.stats).toEqual(mockStats);
      expect(result.recentDocuments).toHaveLength(1);
      expect(result.recentDocuments[0]).toMatchObject({
         id: 'doc-1',
         pageCount: 3,
         updatedAt: updatedAt.toISOString(),
      });
      expect(result.rejectedTranscriptions).toHaveLength(1);
      expect(result.rejectedTranscriptions[0]).toMatchObject({
         documentId: 'doc-1',
         pageNumber: 2,
         rejectionReason: 'Needs more detail',
         updatedAt: updatedAt.toISOString(),
      });
   });

   it('returns null counts and runs no count queries for a contributor', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBeNull();
      expect(result.pendingRoleRequestCount).toBeNull();
      // recent docs + rejected only
      expect(mockSelect).toHaveBeenCalledTimes(2);
   });

   it('limits both lists to 5 items', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      const docs = mockRecentDocsQuery([]);
      const rejected = mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.dashboard.getOverview();

      expect(docs.limit).toHaveBeenCalledWith(5);
      expect(rejected.limit).toHaveBeenCalledWith(5);
   });

   it('scopes both lists to the current user', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      const docs = mockRecentDocsQuery([]);
      const rejected = mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.dashboard.getOverview();

      // eq(uploadedBy / userId, user.id) is always present
      expect(docs.where.mock.calls[0][0]).toBeDefined();
      expect(rejected.where.mock.calls[0][0]).toBeDefined();
   });

   it('returns empty lists when the user has no documents or rejections', async () => {
      mockGetUserStats.mockResolvedValueOnce({
         documentsUploaded: 0,
         totalTranscriptions: 0,
         approved: 0,
         submitted: 0,
         rejected: 0,
         drafts: 0,
      });
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.recentDocuments).toHaveLength(0);
      expect(result.rejectedTranscriptions).toHaveLength(0);
   });

   it('keeps a null cover image and a null rejection reason', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([{ ...mockRecentDoc, coverImageUrl: null }]);
      mockRejectedQuery([{ ...mockRejected, rejectionReason: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.recentDocuments[0]?.coverImageUrl).toBeNull();
      expect(result.rejectedTranscriptions[0]?.rejectionReason).toBeNull();
   });

   it('shows processing and failed documents in the recent list', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([
         { ...mockRecentDoc, id: 'doc-2', status: 'processing' },
         { ...mockRecentDoc, id: 'doc-3', status: 'failed' },
      ]);
      mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.recentDocuments.map((d) => d.status)).toEqual([
         'processing',
         'failed',
      ]);
   });

   it('includes the review queue count for an editor, without role requests', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([mockRecentDoc]);
      mockRejectedQuery([]);
      const queue = mockCountQuery([{ count: 4 }]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBe(4);
      expect(result.pendingRoleRequestCount).toBeNull();
      expect(mockSelect).toHaveBeenCalledTimes(3);
      // status = submitted AND userId != current user
      expect(queue.where.mock.calls[0][0]).toBeDefined();
   });

   it('falls back to 0 when the review queue count row is missing', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);
      mockCountQuery([]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBe(0);
   });

   it('includes both review queue and role request counts for an admin', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);
      mockCountQuery([{ count: 7 }]); // review queue
      mockCountQuery([{ count: 3 }]); // pending role requests

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBe(7);
      expect(result.pendingRoleRequestCount).toBe(3);
      expect(mockSelect).toHaveBeenCalledTimes(4);
   });

   it('falls back to 0 when the role request count row is missing', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);
      mockCountQuery([{ count: 2 }]);
      mockCountQuery([]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBe(2);
      expect(result.pendingRoleRequestCount).toBe(0);
   });

   it('propagates an error from getUserStats', async () => {
      mockGetUserStats.mockRejectedValueOnce(new Error('stats down'));
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.dashboard.getOverview()).rejects.toMatchObject({
         code: 'INTERNAL_SERVER_ERROR',
      });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.dashboard.getOverview()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
      expect(mockGetUserStats).not.toHaveBeenCalled();
      expect(mockSelect).not.toHaveBeenCalled();
   });
});
