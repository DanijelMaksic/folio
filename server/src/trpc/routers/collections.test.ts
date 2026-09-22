import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const { mockInsert, mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => ({
   mockInsert: vi.fn(),
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
   },
}));

vi.mock('@/lib/email.js', () => ({
   sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const contributorUser = mockUser({ globalRole: 'contributor' });
const viewerUser = mockUser({ globalRole: 'viewer' });

const mockCollection = {
   id: 'col-1',
   title: 'Test Collection',
   description: 'A test collection',
   createdBy: contributorUser.id,
   createdAt: new Date(),
   updatedAt: new Date(),
};

beforeEach(() => {
   vi.clearAllMocks();
});

// ── create ───────────────────────

describe('collections.create', () => {
   it('creates and returns a collection', async () => {
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockCollection]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.create({
         title: 'Test Collection',
         description: 'A test collection',
      });

      expect(result).toMatchObject({ title: 'Test Collection' });
   });

   it('creates a collection without a description', async () => {
      const noDesc = { ...mockCollection, description: null };

      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([noDesc]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.create({
         title: 'Test Collection',
      });

      expect(result).toMatchObject({ description: null });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.collections.create({ title: 'Test' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.create({ title: 'Test' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── list ───────────────────────
describe('collections.list', () => {
   it('returns a list of collections', async () => {
      const mockResults = [
         {
            id: mockCollection.id,
            title: mockCollection.title,
            description: mockCollection.description,
            createdBy: mockCollection.createdBy,
            creatorName: 'testUser',
            coverImageUrl: null,
         },
      ];

      // First select: paginated results
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn(() => ({
                     offset: vi.fn(() => ({
                        orderBy: vi.fn().mockResolvedValueOnce(mockResults),
                     })),
                  })),
               })),
            })),
         })),
      });

      // Second select: count query
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ total: 1 }]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 20 });

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0]).toMatchObject({ title: 'Test Collection' });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });
});

// ── getById ───────────────────────

describe('collections.getById', () => {
   it('returns a collection by id', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([mockCollection]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.getById({ id: 'col-1' });

      expect(result).toMatchObject({ id: 'col-1', title: 'Test Collection' });
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.getById({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getCurrentUserCollections ───────────────────────

describe('collections.getCurrentUserCollections', () => {
   it('returns collections for the current user', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn(() => ({
                  offset: vi.fn(() => ({
                     orderBy: vi.fn().mockResolvedValueOnce([mockCollection]),
                  })),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.getCurrentUserCollections({
         page: 1,
         limit: 20,
         userId: contributorUser.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ createdBy: contributorUser.id });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.getCurrentUserCollections({
            page: 1,
            limit: 20,
            userId: contributorUser.id,
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── update ───────────────────────

describe('collections.update', () => {
   it('updates a collection and returns it', async () => {
      const updated = { ...mockCollection, title: 'Updated Title' };

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.update({
         id: 'col-1',
         title: 'Updated Title',
      });

      expect(result).toMatchObject({ title: 'Updated Title' });
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({ id: 'nonexistent', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.collections.update({ id: 'col-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.update({ id: 'col-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── delete ───────────────────────

describe('collections.delete', () => {
   it('deletes a collection and returns it', async () => {
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockCollection]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.delete({ id: 'col-1' });

      expect(result).toMatchObject({ id: 'col-1' });
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.delete({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.collections.delete({ id: 'col-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.delete({ id: 'col-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
