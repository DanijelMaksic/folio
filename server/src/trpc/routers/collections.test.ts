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

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ globalRole: 'editor' });
const viewerUser = mockUser({ globalRole: 'viewer' });

const mockCollection = {
   id: 'col-1',
   title: 'Test Collection',
   description: 'A test collection',
   createdBy: contributorUser.id,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// list: select().from().leftJoin().where() for both queries;
// the results query continues .limit().offset().orderBy()
const mockListQueries = (rows: unknown[], total: number) => {
   const resultsWhere = vi.fn((_where?: unknown) => ({
      limit: vi.fn(() => ({
         offset: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   }));
   const countWhere = vi
      .fn<(where?: unknown) => Promise<unknown>>()
      .mockResolvedValueOnce([{ total }]);

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ leftJoin: vi.fn(() => ({ where: resultsWhere })) })),
   });
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ leftJoin: vi.fn(() => ({ where: countWhere })) })),
   });
   return { resultsWhere, countWhere };
};

const mockOwnListQueries = (rows: unknown[], total: number) => {
   const resultsWhere = vi.fn((_where?: unknown) => ({
      limit: vi.fn(() => ({
         offset: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   }));
   const countWhere = vi
      .fn<(where?: unknown) => Promise<unknown>>()
      .mockResolvedValueOnce([{ total }]);

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: resultsWhere })),
   });
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: countWhere })),
   });
   return { resultsWhere, countWhere };
};

// ownership lookup: select().from().where().limit()
const mockLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

const mockUpdateReturning = (rows: unknown[]) =>
   mockUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

const mockDeleteReturning = (rows: unknown[]) =>
   mockDelete.mockReturnValueOnce({
      where: vi.fn(() => ({
         returning: vi.fn().mockResolvedValueOnce(rows),
      })),
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
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi
               .fn()
               .mockResolvedValueOnce([
                  { ...mockCollection, description: null },
               ]),
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
      mockListQueries(
         [
            {
               id: mockCollection.id,
               title: mockCollection.title,
               description: mockCollection.description,
               createdBy: mockCollection.createdBy,
               creatorName: 'testUser',
               coverImageUrl: null,
            },
         ],
         1,
      );

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 20 });

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0]).toMatchObject({ title: 'Test Collection' });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('includes collections whose creator was deleted', async () => {
      mockListQueries([{ ...mockCollection, creatorName: null }], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 20 });

      expect(result.collections[0]).toMatchObject({ creatorName: null });
   });

   it('passes the same where to results and count when searching', async () => {
      const { resultsWhere, countWhere } = mockListQueries([mockCollection], 1);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20, search: 'Test' });

      expect(resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(resultsWhere.mock.calls[0][0]).toBe(countWhere.mock.calls[0][0]);
   });

   it('applies no where without a search term', async () => {
      const { resultsWhere } = mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20 });

      expect(resultsWhere.mock.calls[0][0]).toBeUndefined();
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
   it('returns the current user collections with pagination info', async () => {
      mockOwnListQueries([mockCollection], 1);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.getCurrentUserCollections({
         page: 1,
         limit: 20,
      });

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0]).toMatchObject({
         createdBy: contributorUser.id,
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('rounds totalPages up', async () => {
      mockOwnListQueries([mockCollection], 25);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.getCurrentUserCollections({
         page: 1,
         limit: 10,
      });

      expect(result.totalPages).toBe(3);
   });

   it('passes the same where to results and count when searching', async () => {
      const { resultsWhere, countWhere } = mockOwnListQueries(
         [mockCollection],
         1,
      );

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.getCurrentUserCollections({
         page: 1,
         limit: 10,
         search: 'Test',
      });

      expect(resultsWhere.mock.calls[0][0]).toStrictEqual(
         countWhere.mock.calls[0][0],
      );
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.getCurrentUserCollections({ page: 1, limit: 20 }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── update ───────────────────────

describe('collections.update', () => {
   it('updates a collection the user owns', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      mockUpdateReturning([{ ...mockCollection, title: 'Updated Title' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.update({
         id: 'col-1',
         title: 'Updated Title',
      });

      expect(result).toMatchObject({ title: 'Updated Title' });
   });

   it("lets an editor update someone else's collection", async () => {
      mockLookup([{ createdBy: 'someone-else' }]);
      mockUpdateReturning([{ ...mockCollection, title: 'Edited' }]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.collections.update({
         id: 'col-1',
         title: 'Edited',
      });

      expect(result).toMatchObject({ title: 'Edited' });
   });

   it("throws FORBIDDEN if a contributor edits someone else's collection", async () => {
      mockLookup([{ createdBy: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({ id: 'col-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN for a contributor when the creator was deleted', async () => {
      mockLookup([{ createdBy: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({ id: 'col-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({ id: 'nonexistent', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if the update returns no row', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({ id: 'col-1', title: 'X' }),
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
   it('deletes a collection the user owns', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      mockDeleteReturning([mockCollection]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.delete({ id: 'col-1' });

      expect(result).toMatchObject({ id: 'col-1' });
   });

   it("lets an editor delete someone else's collection", async () => {
      mockLookup([{ createdBy: 'someone-else' }]);
      mockDeleteReturning([mockCollection]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.collections.delete({ id: 'col-1' });

      expect(result).toMatchObject({ id: 'col-1' });
   });

   it("throws FORBIDDEN if a contributor deletes someone else's collection", async () => {
      mockLookup([{ createdBy: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.delete({ id: 'col-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.delete({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if the delete returns no row', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      mockDeleteReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.delete({ id: 'col-1' }),
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
