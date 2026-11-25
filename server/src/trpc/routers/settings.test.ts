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

vi.mock('@/lib/cloudinary.js', () => ({
   default: {
      uploader: {
         upload: mockUpload,
      },
   },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const validMessage = 'I would like to help transcribe more documents.';

const createdAt = new Date('2025-01-15T10:00:00.000Z');
const reviewedAt = new Date('2025-01-16T10:00:00.000Z');

const mockRoleRequestRow = {
   id: 'req-1',
   userId: contributorUser.id,
   requestedRole: 'editor',
   message: validMessage,
   status: 'pending',
   rejectionReason: null,
   reviewedBy: null,
   reviewedAt: null,
   createdAt,
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where().limit() -> rows (pending-request check)
const mockPendingCheck = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

// select().from().where().orderBy().limit() -> rows (latest request)
const mockLatestRequest = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce(rows),
            })),
         })),
      })),
   });

// insert().values() resolves; returns the values spy
const mockInsertValues = () => {
   const values = vi.fn((_values?: unknown) => Promise.resolve(undefined));
   mockInsert.mockReturnValueOnce({ values });
   return { values };
};

// ── uploadAvatar ───────────────────────

describe('settings.uploadAvatar', () => {
   it('uploads with the per-user public id and returns the url', async () => {
      mockUpload.mockResolvedValueOnce({
         secure_url: 'https://res.cloudinary.com/mock/image/upload/avatar.png',
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.uploadAvatar({
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
            resource_type: 'image',
         }),
      );
   });

   it('crops the avatar to a 400x400 square', async () => {
      mockUpload.mockResolvedValueOnce({ secure_url: 'https://x/a.png' });

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.settings.uploadAvatar({
         fileBase64: 'data:image/png;base64,abc123',
      });

      expect(mockUpload.mock.calls[0][1].transformation[0]).toMatchObject({
         width: 400,
         height: 400,
         crop: 'fill',
      });
   });

   it('uses a different public id per user', async () => {
      mockUpload.mockResolvedValueOnce({ secure_url: 'https://x/a.png' });

      const caller = createAuthenticatedCaller(editorUser);
      await caller.settings.uploadAvatar({
         fileBase64: 'data:image/png;base64,abc123',
      });

      expect(mockUpload).toHaveBeenCalledWith(
         expect.any(String),
         expect.objectContaining({ public_id: `avatars/${editorUser.id}` }),
      );
   });

   it('throws INTERNAL_SERVER_ERROR if the Cloudinary upload fails', async () => {
      mockUpload.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.uploadAvatar({
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({
         code: 'INTERNAL_SERVER_ERROR',
         message: 'Could not upload avatar',
      });
   });

   it('throws BAD_REQUEST if the file is not an image data url', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.uploadAvatar({
            fileBase64: 'data:application/pdf;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockUpload).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.settings.uploadAvatar({
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      expect(mockUpload).not.toHaveBeenCalled();
   });
});

// ── getStats ───────────────────────

describe('settings.getStats', () => {
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
      const result = await caller.settings.getStats();

      expect(result).toEqual(stats);
      expect(mockGetUserStats).toHaveBeenCalledWith(contributorUser.id);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.settings.getStats()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
      expect(mockGetUserStats).not.toHaveBeenCalled();
   });
});

// ── getMyRoleRequest ───────────────────────

describe('settings.getMyRoleRequest', () => {
   it('returns the latest request with ISO date strings', async () => {
      mockLatestRequest([mockRoleRequestRow]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.getMyRoleRequest();

      expect(result).toEqual({
         id: 'req-1',
         requestedRole: 'editor',
         message: validMessage,
         status: 'pending',
         rejectionReason: null,
         createdAt: createdAt.toISOString(),
         reviewedAt: null,
      });
   });

   it('does not leak internal columns', async () => {
      mockLatestRequest([mockRoleRequestRow]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.getMyRoleRequest();

      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('reviewedBy');
   });

   it('returns reviewedAt and rejectionReason for a rejected request', async () => {
      mockLatestRequest([
         {
            ...mockRoleRequestRow,
            status: 'rejected',
            rejectionReason: 'Not enough activity yet',
            reviewedAt,
         },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.getMyRoleRequest();

      expect(result).toMatchObject({
         status: 'rejected',
         rejectionReason: 'Not enough activity yet',
         reviewedAt: reviewedAt.toISOString(),
      });
   });

   it('returns null if the user has never made a request', async () => {
      mockLatestRequest([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.getMyRoleRequest();

      expect(result).toBeNull();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.settings.getMyRoleRequest()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── requestRole ───────────────────────

describe('settings.requestRole', () => {
   it('creates an editor request for a contributor', async () => {
      mockPendingCheck([]);
      const { values } = mockInsertValues();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.settings.requestRole({
         message: validMessage,
      });

      expect(result).toEqual({ success: true });
      expect(values).toHaveBeenCalledWith({
         userId: contributorUser.id,
         requestedRole: 'editor',
         message: validMessage,
      });
   });

   it('throws CONFLICT if a pending request already exists', async () => {
      mockPendingCheck([{ id: 'req-1' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('maps a unique-index violation (23505) on insert to CONFLICT', async () => {
      mockPendingCheck([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockRejectedValueOnce({ code: '23505' }),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
   });

   it('surfaces other insert errors as INTERNAL_SERVER_ERROR', async () => {
      mockPendingCheck([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockRejectedValueOnce(new Error('db exploded')),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
   });

   it('throws BAD_REQUEST if the message is too short', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.settings.requestRole({ message: 'too short' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.settings.requestRole({ message: validMessage }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});
