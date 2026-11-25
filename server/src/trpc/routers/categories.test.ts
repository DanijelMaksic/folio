import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const { mockSelect, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockInsert: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
   },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const mockCategory = {
   id: 'cat-1',
   name: 'Letters',
   slug: 'letters',
   createdAt: new Date().toISOString(),
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().orderBy() -> rows; returns the orderBy spy
const mockListQuery = (rows: unknown[]) => {
   const orderBy = vi.fn((..._args: unknown[]) => Promise.resolve(rows));
   mockSelect.mockReturnValueOnce({ from: vi.fn(() => ({ orderBy })) });
   return { orderBy };
};

// insert().values().returning(); returns the values spy
const mockInsertReturning = (rows: unknown[]) => {
   const values = vi.fn((_values?: unknown) => ({
      returning: vi.fn().mockResolvedValueOnce(rows),
   }));
   mockInsert.mockReturnValueOnce({ values });
   return { values };
};

const mockInsertRejecting = (err: unknown) => {
   mockInsert.mockReturnValueOnce({
      values: vi.fn(() => ({
         returning: vi.fn().mockRejectedValueOnce(err),
      })),
   });
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

const mockUpdateRejecting = (err: unknown) => {
   mockUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({
         where: vi.fn(() => ({
            returning: vi.fn().mockRejectedValueOnce(err),
         })),
      })),
   });
};

// delete().where().returning()
const mockDeleteReturning = (rows: unknown[]) =>
   mockDelete.mockReturnValueOnce({
      where: vi.fn(() => ({
         returning: vi.fn().mockResolvedValueOnce(rows),
      })),
   });

// ── list ───────────────────────

describe('categories.list', () => {
   const rows = [
      {
         id: 'cat-1',
         name: 'Letters',
         slug: 'letters',
         documentCount: 3,
         collectionCount: 1,
      },
      {
         id: 'cat-2',
         name: 'Maps',
         slug: 'maps',
         documentCount: 0,
         collectionCount: 0,
      },
   ];

   it('returns the categories with their counts for anyone', async () => {
      mockListQuery(rows);

      const caller = createUnauthenticatedCaller();
      const result = await caller.categories.list();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
         slug: 'letters',
         documentCount: 3,
         collectionCount: 1,
      });
   });

   it('returns an empty list when there are no categories', async () => {
      mockListQuery([]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.categories.list();

      expect(result).toEqual([]);
   });

   it('orders by lower(name) with id as a tiebreaker', async () => {
      const { orderBy } = mockListQuery(rows);

      const caller = createUnauthenticatedCaller();
      await caller.categories.list();

      expect(orderBy.mock.calls[0]).toHaveLength(2);
   });

   it('works for a signed-in contributor too', async () => {
      mockListQuery(rows);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.categories.list()).resolves.toHaveLength(2);
   });
});

// ── create ───────────────────────

describe('categories.create', () => {
   it.each([
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)('lets an %s create a category', async (_name, user) => {
      const { values } = mockInsertReturning([mockCategory]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.categories.create({ name: 'Letters' });

      expect(result).toMatchObject({ id: 'cat-1', slug: 'letters' });
      expect(values).toHaveBeenCalledWith({ name: 'Letters', slug: 'letters' });
   });

   it.each([
      ['World War II', 'world-war-ii'],
      ['Café Letters', 'cafe-letters'],
      ['  Maps & Atlases  ', 'maps-atlases'],
      ['Diaries/Journals', 'diaries-journals'],
      ['A -- B', 'a-b'],
   ])('slugifies "%s" to "%s"', async (name, slug) => {
      const { values } = mockInsertReturning([{ ...mockCategory, slug }]);

      const caller = createAuthenticatedCaller(editorUser);
      await caller.categories.create({ name });

      expect(values).toHaveBeenCalledWith(expect.objectContaining({ slug }));
   });

   it('stores the trimmed name', async () => {
      const { values } = mockInsertReturning([mockCategory]);

      const caller = createAuthenticatedCaller(editorUser);
      await caller.categories.create({ name: '  Letters  ' });

      expect(values).toHaveBeenCalledWith({ name: 'Letters', slug: 'letters' });
   });

   it('throws BAD_REQUEST when the name produces an empty slug', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.create({ name: '!!' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Invalid name' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST when the name is too short', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.create({ name: 'a' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST when the name is too long', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.create({ name: 'a'.repeat(41) }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('maps a unique violation (23505) to CONFLICT', async () => {
      mockInsertRejecting({ code: '23505' });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.create({ name: 'Letters' }),
      ).rejects.toMatchObject({
         code: 'CONFLICT',
         message: 'Category already exists',
      });
   });

   it('rethrows other database errors', async () => {
      mockInsertRejecting(new Error('db down'));

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.create({ name: 'Letters' }),
      ).rejects.toThrow();
   });

   it('throws FORBIDDEN for a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.categories.create({ name: 'Letters' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.categories.create({ name: 'Letters' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── update ───────────────────────

describe('categories.update', () => {
   it.each([
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)('lets an %s rename a category', async (_name, user) => {
      const { set } = mockUpdateReturning([
         { ...mockCategory, name: 'Old Letters', slug: 'old-letters' },
      ]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.categories.update({
         id: 'cat-1',
         name: 'Old Letters',
      });

      expect(result).toMatchObject({ name: 'Old Letters' });
      expect(set).toHaveBeenCalledWith({
         name: 'Old Letters',
         slug: 'old-letters',
      });
   });

   it('regenerates the slug from the new name', async () => {
      const { set } = mockUpdateReturning([mockCategory]);

      const caller = createAuthenticatedCaller(editorUser);
      await caller.categories.update({ id: 'cat-1', name: 'Café Maps' });

      expect(set).toHaveBeenCalledWith({
         name: 'Café Maps',
         slug: 'cafe-maps',
      });
   });

   it('throws BAD_REQUEST when the name produces an empty slug', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.update({ id: 'cat-1', name: '!!' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Invalid name' });

      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND when the category does not exist', async () => {
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.update({ id: 'missing', name: 'Letters' }),
      ).rejects.toMatchObject({
         code: 'NOT_FOUND',
         message: 'Category not found',
      });
   });

   it('maps a unique violation (23505) to CONFLICT', async () => {
      mockUpdateRejecting({ code: '23505' });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.update({ id: 'cat-1', name: 'Maps' }),
      ).rejects.toMatchObject({
         code: 'CONFLICT',
         message: 'Category already exists',
      });
   });

   it('rethrows other database errors', async () => {
      mockUpdateRejecting(new Error('db down'));

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.update({ id: 'cat-1', name: 'Maps' }),
      ).rejects.toThrow();
   });

   it('throws FORBIDDEN for a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.categories.update({ id: 'cat-1', name: 'Maps' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.categories.update({ id: 'cat-1', name: 'Maps' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── delete ───────────────────────

describe('categories.delete', () => {
   it.each([
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)('lets an %s delete a category', async (_name, user) => {
      mockDeleteReturning([{ id: 'cat-1' }]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.categories.delete({ id: 'cat-1' });

      expect(result).toEqual({ id: 'cat-1' });
   });

   it('throws NOT_FOUND when the category does not exist', async () => {
      mockDeleteReturning([]);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.categories.delete({ id: 'missing' }),
      ).rejects.toMatchObject({
         code: 'NOT_FOUND',
         message: 'Category not found',
      });
   });

   it('throws FORBIDDEN for a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.categories.delete({ id: 'cat-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.categories.delete({ id: 'cat-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
