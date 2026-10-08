import { mockUser } from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockInsert, mockUpload, mockGetUserStats } = vi.hoisted(
   () => ({
      mockSelect: vi.fn(),
      mockInsert: vi.fn(),
      mockUpload: vi.fn(),
      mockGetUserStats: vi.fn(),
   }),
);

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      insert: mockInsert,
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
         upload: mockUpload,
         destroy: vi.fn(),
      },
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: {
      add: vi.fn(),
   },
}));

const viewerUser = mockUser({ globalRole: 'viewer' });
const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const validMessage = 'I would like to help transcribe more documents.';

const createdAt = new Date('2025-01-15T10:00:00.000Z');
const reviewedAt = new Date('2025-01-16T10:00:00.000Z');

const mockRoleRequestRow = {
   id: 'req-1',
   userId: viewerUser.id,
   requestedRole: 'contributor',
   message: validMessage,
   status: 'pending',
   rejectionReason: null,
   reviewedBy: null,
   reviewedAt: null,
   createdAt,
};

// Chain: select().from().where().limit()  (pending-request check)
function mockPendingCheck(rows: unknown[]) {
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });
}

beforeEach(() => {
   vi.clearAllMocks();
});

// ── uploadAvatar ───────────────────────

describe('profile.uploadAvatar', () => {
   it('uploads to Cloudinary with the per-user public id and returns the url', async () => {
      mockUpload.mockResolvedValueOnce({
         secure_url: 'https://res.cloudinary.com/mock/image/upload/avatar.png',
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.profile.uploadAvatar({
         fileBase64: 'data:image/png;base64,abc123',
      });

      expect(result).toEqual({
         imageUrl: 'https://res.cloudinary.com/mock/image/upload/avatar.png',
      });
      expect(mockUpload).toHaveBeenCalledWith(
         'data:image/png;base64,abc123',
         expect.objectContaining({
            public_id: `avatars/${contributorUser.id}`,
            overwrite: true,
            invalidate: true,
         }),
      );
   });

   it('throws INTERNAL_SERVER_ERROR if the Cloudinary upload fails', async () => {
      mockUpload.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.profile.uploadAvatar({
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
   });

   it('throws BAD_REQUEST if the file is not an image data url', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.profile.uploadAvatar({
            fileBase64: 'data:application/pdf;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockUpload).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.profile.uploadAvatar({
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getStats ───────────────────────

describe('profile.getStats', () => {
   it('returns the stats for the current user', async () => {
      const stats = {
         documentsUploaded: 2,
         totalTranscriptions: 10,
         approved: 5,
         submitted: 2,
         rejected: 1,
         drafts: 2,
      };
      mockGetUserStats.mockResolvedValueOnce(stats);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.profile.getStats();

      expect(result).toEqual(stats);
      expect(mockGetUserStats).toHaveBeenCalledWith(contributorUser.id);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.profile.getStats()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});

// ── getMyRoleRequest ───────────────────────

describe('profile.getMyRoleRequest', () => {
   it('returns the latest request with ISO date strings', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               orderBy: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([mockRoleRequestRow]),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      const result = await caller.profile.getMyRoleRequest();

      expect(result).toMatchObject({
         id: 'req-1',
         requestedRole: 'contributor',
         status: 'pending',
         rejectionReason: null,
         createdAt: createdAt.toISOString(),
         reviewedAt: null,
      });
   });

   it('returns reviewedAt and rejectionReason for a rejected request', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               orderBy: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([
                     {
                        ...mockRoleRequestRow,
                        status: 'rejected',
                        rejectionReason: 'Not enough activity yet',
                        reviewedAt,
                     },
                  ]),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      const result = await caller.profile.getMyRoleRequest();

      expect(result).toMatchObject({
         status: 'rejected',
         rejectionReason: 'Not enough activity yet',
         reviewedAt: reviewedAt.toISOString(),
      });
   });

   it('returns null if the user has never made a request', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               orderBy: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([]),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      const result = await caller.profile.getMyRoleRequest();

      expect(result).toBeNull();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.profile.getMyRoleRequest()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});

// ── requestRole ───────────────────────

describe('profile.requestRole', () => {
   it('creates a contributor request for a viewer', async () => {
      mockPendingCheck([]);
      const mockValues = vi.fn().mockResolvedValueOnce(undefined);
      mockInsert.mockReturnValueOnce({ values: mockValues });

      const caller = createAuthenticatedCaller(viewerUser);
      const result = await caller.profile.requestRole({
         message: validMessage,
      });

      expect(result).toEqual({ success: true });
      expect(mockValues).toHaveBeenCalledWith({
         userId: viewerUser.id,
         requestedRole: 'contributor',
         message: validMessage,
      });
   });

   it('creates an editor request for a contributor', async () => {
      mockPendingCheck([]);
      const mockValues = vi.fn().mockResolvedValueOnce(undefined);
      mockInsert.mockReturnValueOnce({ values: mockValues });

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.profile.requestRole({ message: validMessage });

      expect(mockValues).toHaveBeenCalledWith(
         expect.objectContaining({
            userId: contributorUser.id,
            requestedRole: 'editor',
         }),
      );
   });

   it('throws BAD_REQUEST for an editor (no higher role)', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST for an admin (no higher role)', async () => {
      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws CONFLICT if a pending request already exists', async () => {
      mockPendingCheck([{ id: 'req-1' }]);

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('maps a unique-index violation (23505) on insert to CONFLICT', async () => {
      mockPendingCheck([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockRejectedValueOnce({ code: '23505' }),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
   });

   it('rethrows other insert errors as INTERNAL_SERVER_ERROR', async () => {
      mockPendingCheck([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockRejectedValueOnce(new Error('db exploded')),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
   });

   it('throws BAD_REQUEST if the message is too short', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.profile.requestRole({ message: 'too short' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.profile.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
