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

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });
const viewerUser = mockUser({ globalRole: 'viewer' });

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

// Chain: select().from().leftJoin().where().groupBy().orderBy().limit()
function mockRecentDocsQuery(rows: unknown[]) {
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
               groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                     limit: vi.fn().mockResolvedValueOnce(rows),
                  })),
               })),
            })),
         })),
      })),
   });
}

// Chain: select().from().innerJoin().innerJoin().where().orderBy().limit()
function mockRejectedQuery(rows: unknown[]) {
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                     limit: vi.fn().mockResolvedValueOnce(rows),
                  })),
               })),
            })),
         })),
      })),
   });
}

// Chain: select().from().where() (used for both count queries)
function mockCountQuery(rows: unknown[]) {
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(rows),
      })),
   });
}

beforeEach(() => {
   vi.clearAllMocks();
});

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

   it('returns null counts for a contributor', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([]);
      mockRejectedQuery([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBeNull();
      expect(result.pendingRoleRequestCount).toBeNull();
      // recent docs + rejected only, no count queries
      expect(mockSelect).toHaveBeenCalledTimes(2);
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

   it('keeps a null cover image and null rejection reason', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([{ ...mockRecentDoc, coverImageUrl: null }]);
      mockRejectedQuery([{ ...mockRejected, rejectionReason: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.recentDocuments[0]?.coverImageUrl).toBeNull();
      expect(result.rejectedTranscriptions[0]?.rejectionReason).toBeNull();
   });

   it('includes the review queue count for an editor', async () => {
      mockGetUserStats.mockResolvedValueOnce(mockStats);
      mockRecentDocsQuery([mockRecentDoc]);
      mockRejectedQuery([]);
      mockCountQuery([{ count: 4 }]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.dashboard.getOverview();

      expect(result.reviewQueueCount).toBe(4);
      expect(result.pendingRoleRequestCount).toBeNull();
      expect(mockSelect).toHaveBeenCalledTimes(3);
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

   it('returns null stats and empty rejections for a viewer', async () => {
      mockRecentDocsQuery([]);

      const caller = createAuthenticatedCaller(viewerUser);
      const result = await caller.dashboard.getOverview();

      expect(result.stats).toBeNull();
      expect(result.rejectedTranscriptions).toHaveLength(0);
      expect(result.reviewQueueCount).toBeNull();
      expect(result.pendingRoleRequestCount).toBeNull();
      expect(mockGetUserStats).not.toHaveBeenCalled();
      // only the recent documents query runs
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.dashboard.getOverview()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});
