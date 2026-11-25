import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const {
   mockInsert,
   mockSelect,
   mockUpdate,
   mockDelete,
   mockGetCollectionProgress,
   mockGetDocumentProgress,
} = vi.hoisted(() => ({
   mockInsert: vi.fn(),
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
   mockGetCollectionProgress: vi.fn(),
   mockGetDocumentProgress: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
   },
}));

// assertCategoryExists lives in the documents router, which imports these
vi.mock('@/lib/cloudinary.js', () => ({
   default: {
      uploader: { upload: vi.fn() },
      api: { delete_resources: vi.fn() },
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: { add: vi.fn() },
}));

vi.mock('@/lib/transcription-progress.js', () => ({
   getCollectionProgress: mockGetCollectionProgress,
   getDocumentProgress: mockGetDocumentProgress,
}));

const contributorUser = mockUser({ globalRole: 'contributor' });

const mockCollection = {
   id: 'col-1',
   title: 'Test Collection',
   description: 'A test collection',
   createdBy: contributorUser.id,
   categoryId: null,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where().limit() -> rows (ownership lookup)
const mockLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

// assertCategoryExists lookup
const mockCategoryExists = (exists: boolean) =>
   mockLookup(exists ? [{ id: 'cat-1' }] : []);

// insert().values().returning(); returns the values spy
const mockInsertReturning = (rows: unknown[]) => {
   const values = vi.fn((_values?: unknown) => ({
      returning: vi.fn().mockResolvedValueOnce(rows),
   }));
   mockInsert.mockReturnValueOnce({ values });
   return { values };
};

// update().set().where().returning(); returns the set spy
const mockUpdateReturning = (rows: unknown[]) => {
   const set = vi.fn((_fields?: unknown) => ({
      where: vi.fn(() => ({
         returning: vi.fn().mockResolvedValueOnce(rows),
      })),
   }));
   mockUpdate.mockReturnValueOnce({ set });
   return { set };
};

// delete().where().returning()
const mockDeleteReturning = (rows: unknown[]) =>
   mockDelete.mockReturnValueOnce({
      where: vi.fn(() => ({
         returning: vi.fn().mockResolvedValueOnce(rows),
      })),
   });

// list: both queries are select().from().leftJoin(user).leftJoin(categories).where();
// the results query continues .limit().offset().orderBy().
// Results are queued first, because the router builds that query first.
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

   const resultsInnerJoin = vi.fn(() => ({ where: resultsWhere }));
   const countInnerJoin = vi.fn(() => ({ where: countWhere }));
   const resultsOuterJoin = vi.fn(() => ({ leftJoin: resultsInnerJoin }));
   const countOuterJoin = vi.fn(() => ({ leftJoin: countInnerJoin }));

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ leftJoin: resultsOuterJoin })),
   });
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ leftJoin: countOuterJoin })),
   });

   return {
      resultsWhere,
      countWhere,
      resultsOuterJoin,
      resultsInnerJoin,
      countOuterJoin,
      countInnerJoin,
   };
};

// getCurrentUserCollections: select().from().where() for both queries
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

// getById: select().from().leftJoin().leftJoin().where() -> rows
const mockGetByIdQuery = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce(rows),
            })),
         })),
      })),
   });

// ── create ───────────────────────

describe('collections.create', () => {
   it('creates and returns a collection', async () => {
      mockInsertReturning([mockCollection]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.create({
         title: 'Test Collection',
         description: 'A test collection',
      });

      expect(result).toMatchObject({ title: 'Test Collection' });
   });

   it('creates a collection without a description', async () => {
      const { values } = mockInsertReturning([
         { ...mockCollection, description: null },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.create({
         title: 'Test Collection',
      });

      expect(result).toMatchObject({ description: null });
      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({
            description: null,
            createdBy: contributorUser.id,
         }),
      );
   });

   it('stores categoryId as null and skips the lookup when none is given', async () => {
      const { values } = mockInsertReturning([mockCollection]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.create({ title: 'Test Collection' });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: null }),
      );
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('saves a valid category', async () => {
      mockCategoryExists(true);
      const { values } = mockInsertReturning([
         { ...mockCollection, categoryId: 'cat-1' },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.create({
         title: 'Test Collection',
         categoryId: 'cat-1',
      });

      expect(result).toMatchObject({ categoryId: 'cat-1' });
      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: 'cat-1' }),
      );
   });

   it('rejects an unknown category before inserting', async () => {
      mockCategoryExists(false);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.create({
            title: 'Test Collection',
            categoryId: 'missing',
         }),
      ).rejects.toMatchObject({
         code: 'BAD_REQUEST',
         message: 'Unknown category',
      });
      expect(mockInsert).not.toHaveBeenCalled();
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
               categoryName: null,
               categorySlug: null,
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

   it('returns an empty list when there are no collections', async () => {
      mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 20 });

      expect(result.collections).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
   });

   it('rounds totalPages up', async () => {
      mockListQueries([mockCollection], 25);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 10 });

      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(3);
   });

   it('includes collections whose creator was deleted', async () => {
      mockListQueries([{ ...mockCollection, creatorName: null }], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({ page: 1, limit: 20 });

      expect(result.collections[0]).toMatchObject({ creatorName: null });
   });

   it('joins user and categories in both the data and count queries', async () => {
      const q = mockListQueries([mockCollection], 1);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20 });

      expect(q.resultsOuterJoin).toHaveBeenCalledTimes(1);
      expect(q.resultsInnerJoin).toHaveBeenCalledTimes(1);
      expect(q.countOuterJoin).toHaveBeenCalledTimes(1);
      expect(q.countInnerJoin).toHaveBeenCalledTimes(1);
   });

   it('passes the same where to results and count when searching', async () => {
      const { resultsWhere, countWhere } = mockListQueries([mockCollection], 1);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20, search: 'Test' });

      expect(resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(resultsWhere.mock.calls[0][0]).toBe(countWhere.mock.calls[0][0]);
   });

   it('applies no where without any filter', async () => {
      const { resultsWhere, countWhere } = mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20 });

      expect(resultsWhere.mock.calls[0][0]).toBeUndefined();
      expect(countWhere.mock.calls[0][0]).toBeUndefined();
   });

   it('adds a condition when categorySlug is given', async () => {
      const base = mockListQueries([mockCollection], 1);
      const filtered = mockListQueries([mockCollection], 1);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({ page: 1, limit: 20 });
      await caller.collections.list({
         page: 1,
         limit: 20,
         categorySlug: 'letters',
      });

      expect(base.resultsWhere.mock.calls[0][0]).toBeUndefined();
      expect(filtered.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(filtered.resultsWhere.mock.calls[0][0]).toBe(
         filtered.countWhere.mock.calls[0][0],
      );
   });

   it('returns an empty list for an unknown category slug', async () => {
      mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.list({
         page: 1,
         limit: 20,
         categorySlug: 'does-not-exist',
      });

      expect(result.collections).toHaveLength(0);
      expect(result.totalCount).toBe(0);
   });

   it('adds a condition when filtering by user', async () => {
      const q = mockListQueries([mockCollection], 1);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({
         page: 1,
         limit: 20,
         userId: contributorUser.id,
      });

      expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(q.resultsWhere.mock.calls[0][0]).toBe(
         q.countWhere.mock.calls[0][0],
      );
   });

   it.each(['transcribed', 'not-transcribed'] as const)(
      'adds a condition for status %s in both queries',
      async (status) => {
         const q = mockListQueries([mockCollection], 1);

         const caller = createUnauthenticatedCaller();
         await caller.collections.list({ page: 1, limit: 20, status });

         expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
         expect(q.resultsWhere.mock.calls[0][0]).toBe(
            q.countWhere.mock.calls[0][0],
         );
      },
   );

   it('applies no condition for the all-collections status', async () => {
      const { resultsWhere } = mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.collections.list({
         page: 1,
         limit: 20,
         status: 'all-collections',
      });

      expect(resultsWhere.mock.calls[0][0]).toBeUndefined();
   });

   it('rejects a limit above 100', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.list({ page: 1, limit: 101 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── getById ───────────────────────

describe('collections.getById', () => {
   it('returns a collection by id', async () => {
      mockGetByIdQuery([mockCollection]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.getById({ id: 'col-1' });

      expect(result).toMatchObject({ id: 'col-1', title: 'Test Collection' });
   });

   it('returns the category fields', async () => {
      mockGetByIdQuery([
         {
            ...mockCollection,
            categoryId: 'cat-1',
            categoryName: 'Letters',
            categorySlug: 'letters',
         },
      ]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.getById({ id: 'col-1' });

      expect(result).toMatchObject({
         categoryId: 'cat-1',
         categoryName: 'Letters',
         categorySlug: 'letters',
      });
   });

   it('throws NOT_FOUND if collection does not exist', async () => {
      mockGetByIdQuery([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.getById({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getStats ───────────────────────

describe('collections.getStats', () => {
   // select().from().where() -> rows
   const mockExists = (rows: unknown[]) =>
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(rows),
         })),
      });

   it('returns progress for an existing collection', async () => {
      mockExists([{ id: 'col-1' }]);
      const progress = { totalDocuments: 3, transcribedDocuments: 1 };
      mockGetCollectionProgress.mockResolvedValueOnce(progress);

      const caller = createUnauthenticatedCaller();
      const result = await caller.collections.getStats({ id: 'col-1' });

      expect(result).toEqual(progress);
      expect(mockGetCollectionProgress).toHaveBeenCalledWith('col-1');
   });

   it('throws NOT_FOUND if the collection does not exist', async () => {
      mockExists([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.getStats({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockGetCollectionProgress).not.toHaveBeenCalled();
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

      expect(resultsWhere.mock.calls[0][0]).toBe(countWhere.mock.calls[0][0]);
   });

   it('always scopes the query to the current user', async () => {
      const { resultsWhere } = mockOwnListQueries([], 0);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.getCurrentUserCollections({
         page: 1,
         limit: 20,
      });

      // eq(createdBy, user.id) is always present, even without a search
      expect(resultsWhere.mock.calls[0][0]).toBeDefined();
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

   it('does not look up a category when categoryId is not sent', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      mockUpdateReturning([mockCollection]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.update({ id: 'col-1', title: 'X' });

      // only the ownership lookup
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('sets a valid category', async () => {
      mockCategoryExists(true); // runs before the ownership lookup
      mockLookup([{ createdBy: contributorUser.id }]);
      const { set } = mockUpdateReturning([
         { ...mockCollection, categoryId: 'cat-1' },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.collections.update({
         id: 'col-1',
         title: 'Test Collection',
         categoryId: 'cat-1',
      });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: 'cat-1' }),
      );
      expect(result).toMatchObject({ categoryId: 'cat-1' });
   });

   it('clears the category when categoryId is null', async () => {
      mockLookup([{ createdBy: contributorUser.id }]); // no category lookup for null
      const { set } = mockUpdateReturning([
         { ...mockCollection, categoryId: null },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.update({
         id: 'col-1',
         title: 'Test Collection',
         categoryId: null,
      });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: null }),
      );
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('does not send id in the update fields', async () => {
      mockLookup([{ createdBy: contributorUser.id }]);
      const { set } = mockUpdateReturning([mockCollection]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.collections.update({ id: 'col-1', title: 'X' });

      expect(set.mock.calls[0][0]).not.toHaveProperty('id');
   });

   it('rejects an unknown category before touching the collection', async () => {
      mockCategoryExists(false);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.update({
            id: 'col-1',
            title: 'X',
            categoryId: 'missing',
         }),
      ).rejects.toMatchObject({
         code: 'BAD_REQUEST',
         message: 'Unknown category',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s update someone else's collection",
      async (role) => {
         mockLookup([{ createdBy: 'someone-else' }]);
         mockUpdateReturning([{ ...mockCollection, title: 'Edited' }]);

         const caller = createAuthenticatedCaller(
            mockUser({ globalRole: role }),
         );
         const result = await caller.collections.update({
            id: 'col-1',
            title: 'Edited',
         });

         expect(result).toMatchObject({ title: 'Edited' });
      },
   );

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

   it.each(['editor', 'admin'] as const)(
      "lets an %s delete someone else's collection",
      async (role) => {
         mockLookup([{ createdBy: 'someone-else' }]);
         mockDeleteReturning([mockCollection]);

         const caller = createAuthenticatedCaller(
            mockUser({ globalRole: role }),
         );
         const result = await caller.collections.delete({ id: 'col-1' });

         expect(result).toMatchObject({ id: 'col-1' });
      },
   );

   it("throws FORBIDDEN if a contributor deletes someone else's collection", async () => {
      mockLookup([{ createdBy: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.collections.delete({ id: 'col-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN for a contributor when the creator was deleted', async () => {
      mockLookup([{ createdBy: null }]);

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

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.collections.delete({ id: 'col-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
