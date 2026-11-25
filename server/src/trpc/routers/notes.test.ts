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

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: { add: vi.fn() },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const createdAt = new Date('2026-01-01T00:00:00Z');

const mockNote = {
   id: 'note-1',
   pageId: 'page-1',
   userId: contributorUser.id,
   content: 'A useful note',
   createdAt,
   updatedAt: createdAt,
};

const mockPageNote = {
   ...mockNote,
   authorName: 'Author',
   authorUsername: 'author',
   authorAvatar: null,
};

const mockUserNote = {
   id: 'note-1',
   content: 'A useful note',
   createdAt,
   updatedAt: createdAt,
   pageId: 'page-1',
   pageNumber: 1,
   pageTitle: 'Page 1',
   documentId: 'doc-1',
   documentTitle: 'Test Document',
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where() -> rows (lookup without limit)
const mockWhereLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(rows),
      })),
   });

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

// listByPage:
//   results: select().from().leftJoin().where().orderBy(order, id).limit().offset()
//   count:   select().from().where()
const mockByPageQueries = (rows: unknown[], total: number) => {
   const offset = vi.fn((_n?: number) => Promise.resolve(rows));
   const limit = vi.fn((_n?: number) => ({ offset }));
   const orderBy = vi.fn((..._args: unknown[]) => ({ limit }));
   const resultsWhere = vi.fn((_where?: unknown) => ({ orderBy }));
   const countWhere = vi
      .fn<(where?: unknown) => Promise<unknown>>()
      .mockResolvedValueOnce([{ total }]);

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         leftJoin: vi.fn(() => ({ where: resultsWhere })),
      })),
   });
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: countWhere })),
   });

   return { resultsWhere, countWhere, orderBy, limit, offset };
};

// listByUser:
//   results: select().from().innerJoin().innerJoin().where().orderBy(order, id).limit().offset()
//   count:   select().from().innerJoin().innerJoin().where()
const mockByUserQueries = (rows: unknown[], total: number) => {
   const offset = vi.fn((_n?: number) => Promise.resolve(rows));
   const limit = vi.fn((_n?: number) => ({ offset }));
   const orderBy = vi.fn((..._args: unknown[]) => ({ limit }));
   const resultsWhere = vi.fn((_where?: unknown) => ({ orderBy }));
   const countWhere = vi
      .fn<(where?: unknown) => Promise<unknown>>()
      .mockResolvedValueOnce([{ total }]);

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({ where: resultsWhere })),
         })),
      })),
   });
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({ where: countWhere })),
         })),
      })),
   });

   return { resultsWhere, countWhere, orderBy, limit, offset };
};

// ── listByPage ───────────────────────

describe('notes.listByPage', () => {
   const input = {
      pageId: 'page-1',
      page: 1,
      limit: 20,
      sort: 'newest',
   } as const;

   it('returns the notes of a page with pagination info', async () => {
      mockByPageQueries([mockPageNote], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByPage(input);

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]).toMatchObject({
         id: 'note-1',
         authorUsername: 'author',
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('rounds totalPages up', async () => {
      mockByPageQueries([mockPageNote], 45);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByPage(input);

      expect(result.totalCount).toBe(45);
      expect(result.totalPages).toBe(3);
   });

   it('returns at least one page when there are no notes', async () => {
      mockByPageQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByPage(input);

      expect(result.notes).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(1);
   });

   it('keeps notes whose author was deleted', async () => {
      mockByPageQueries(
         [
            {
               ...mockPageNote,
               userId: null,
               authorName: null,
               authorUsername: null,
            },
         ],
         1,
      );

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByPage(input);

      expect(result.notes[0]).toMatchObject({
         userId: null,
         authorUsername: null,
      });
   });

   it('uses the same where for the data and count queries', async () => {
      const q = mockByPageQueries([mockPageNote], 1);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByPage(input);

      expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(q.resultsWhere.mock.calls[0][0]).toStrictEqual(
         q.countWhere.mock.calls[0][0],
      );
   });

   it('computes limit and offset from page and limit', async () => {
      const q = mockByPageQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByPage({ ...input, page: 3, limit: 10 });

      expect(q.limit).toHaveBeenCalledWith(10);
      expect(q.offset).toHaveBeenCalledWith(20);
   });

   it('orders by createdAt plus id for both sorts', async () => {
      const newest = mockByPageQueries([], 0);
      const oldest = mockByPageQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByPage({ ...input, sort: 'newest' });
      await caller.notes.listByPage({ ...input, sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
   });

   it('works for a signed-in user', async () => {
      mockByPageQueries([mockPageNote], 1);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.notes.listByPage(input);

      expect(result.notes).toHaveLength(1);
   });

   it('rejects a limit above the schema maximum', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.notes.listByPage({ ...input, limit: 100000 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── create ───────────────────────

describe('notes.create', () => {
   it.each([
      ['contributor', contributorUser],
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)('lets a %s create a note', async (_name, user) => {
      mockWhereLookup([{ id: 'page-1' }]);
      const { values } = mockInsertReturning([
         { ...mockNote, userId: user.id },
      ]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.notes.create({
         pageId: 'page-1',
         content: 'A useful note',
      });

      expect(result).toMatchObject({ id: 'note-1', userId: user.id });
      expect(values).toHaveBeenCalledWith({
         pageId: 'page-1',
         userId: user.id,
         content: 'A useful note',
      });
   });

   it('throws NOT_FOUND when the page does not exist', async () => {
      mockWhereLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.notes.create({ pageId: 'missing', content: 'A useful note' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.notes.create({ pageId: 'page-1', content: 'A useful note' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── update ───────────────────────

describe('notes.update', () => {
   it('lets the author edit their note', async () => {
      mockWhereLookup([{ id: 'note-1', userId: contributorUser.id }]);
      const { set } = mockUpdateReturning([{ ...mockNote, content: 'Edited' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.notes.update({
         id: 'note-1',
         content: 'Edited',
      });

      expect(result).toMatchObject({ content: 'Edited' });
      expect(set).toHaveBeenCalledWith({ content: 'Edited' });
   });

   it("throws FORBIDDEN when editing someone else's note", async () => {
      mockWhereLookup([{ id: 'note-1', userId: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.notes.update({ id: 'note-1', content: 'Edited' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it.each([
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)(
      "throws FORBIDDEN when an %s edits someone else's note (only the author edits)",
      async (_name, user) => {
         mockWhereLookup([{ id: 'note-1', userId: 'someone-else' }]);

         const caller = createAuthenticatedCaller(user);
         await expect(
            caller.notes.update({ id: 'note-1', content: 'Edited' }),
         ).rejects.toMatchObject({ code: 'FORBIDDEN' });

         expect(mockUpdate).not.toHaveBeenCalled();
      },
   );

   it('throws FORBIDDEN when the author was deleted', async () => {
      mockWhereLookup([{ id: 'note-1', userId: null }]);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.notes.update({ id: 'note-1', content: 'Edited' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND when the note does not exist', async () => {
      mockWhereLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.notes.update({ id: 'missing', content: 'Edited' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND when the update returns no row', async () => {
      mockWhereLookup([{ id: 'note-1', userId: contributorUser.id }]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.notes.update({ id: 'note-1', content: 'Edited' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.notes.update({ id: 'note-1', content: 'Edited' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── delete ───────────────────────

describe('notes.delete', () => {
   it('lets the author delete their note', async () => {
      mockWhereLookup([{ id: 'note-1', userId: contributorUser.id }]);
      mockDeleteReturning([{ id: 'note-1' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.notes.delete({ id: 'note-1' });

      expect(result).toEqual({ id: 'note-1' });
   });

   it.each([
      ['editor', editorUser],
      ['admin', adminUser],
   ] as const)("lets an %s delete someone else's note", async (_name, user) => {
      mockWhereLookup([{ id: 'note-1', userId: 'someone-else' }]);
      mockDeleteReturning([{ id: 'note-1' }]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.notes.delete({ id: 'note-1' });

      expect(result).toEqual({ id: 'note-1' });
   });

   it("throws FORBIDDEN when a contributor deletes someone else's note", async () => {
      mockWhereLookup([{ id: 'note-1', userId: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.notes.delete({ id: 'note-1' })).rejects.toMatchObject(
         { code: 'FORBIDDEN' },
      );

      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN for a contributor when the author was deleted', async () => {
      mockWhereLookup([{ id: 'note-1', userId: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.notes.delete({ id: 'note-1' })).rejects.toMatchObject(
         { code: 'FORBIDDEN' },
      );

      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('lets an editor delete a note whose author was deleted', async () => {
      mockWhereLookup([{ id: 'note-1', userId: null }]);
      mockDeleteReturning([{ id: 'note-1' }]);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(caller.notes.delete({ id: 'note-1' })).resolves.toEqual({
         id: 'note-1',
      });
   });

   it('throws NOT_FOUND when the note does not exist', async () => {
      mockWhereLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.notes.delete({ id: 'missing' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND when the delete returns no row', async () => {
      mockWhereLookup([{ id: 'note-1', userId: contributorUser.id }]);
      mockDeleteReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.notes.delete({ id: 'note-1' })).rejects.toMatchObject(
         { code: 'NOT_FOUND' },
      );
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.notes.delete({ id: 'note-1' })).rejects.toMatchObject(
         { code: 'UNAUTHORIZED' },
      );
   });
});

// ── listByUser ───────────────────────

describe('notes.listByUser', () => {
   const input = {
      userId: 'author-id',
      page: 1,
      limit: 20,
      sort: 'newest',
   } as const;

   it('returns the notes with pagination info', async () => {
      mockByUserQueries([mockUserNote], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByUser(input);

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]).toMatchObject({
         documentId: 'doc-1',
         pageNumber: 1,
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('rounds totalPages up', async () => {
      mockByUserQueries([mockUserNote], 45);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByUser(input);

      expect(result.totalPages).toBe(3);
   });

   it('returns at least one page when there are no notes', async () => {
      mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.notes.listByUser(input);

      expect(result.notes).toEqual([]);
      expect(result.totalPages).toBe(1);
   });

   it('uses the same where for the data and count queries', async () => {
      const q = mockByUserQueries([mockUserNote], 1);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByUser({ ...input, search: 'letter' });

      expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(q.resultsWhere.mock.calls[0][0]).toStrictEqual(
         q.countWhere.mock.calls[0][0],
      );
   });

   it('adds a condition when searching', async () => {
      const base = mockByUserQueries([], 0);
      const searched = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByUser(input);
      await caller.notes.listByUser({ ...input, search: 'letter' });

      expect(searched.resultsWhere.mock.calls[0][0]).not.toStrictEqual(
         base.resultsWhere.mock.calls[0][0],
      );
   });

   it('ignores a whitespace-only search', async () => {
      const base = mockByUserQueries([], 0);
      const blank = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByUser(input);
      await caller.notes.listByUser({ ...input, search: '   ' });

      expect(blank.resultsWhere.mock.calls[0][0]).toStrictEqual(
         base.resultsWhere.mock.calls[0][0],
      );
   });

   it('computes limit and offset from page and limit', async () => {
      const q = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByUser({ ...input, page: 3, limit: 10 });

      expect(q.limit).toHaveBeenCalledWith(10);
      expect(q.offset).toHaveBeenCalledWith(20);
   });

   it('orders by createdAt plus id for both sorts', async () => {
      const newest = mockByUserQueries([], 0);
      const oldest = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.notes.listByUser({ ...input, sort: 'newest' });
      await caller.notes.listByUser({ ...input, sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
   });

   it('works for a signed-in user', async () => {
      mockByUserQueries([mockUserNote], 1);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.notes.listByUser(input);

      expect(result.notes).toHaveLength(1);
   });

   it('rejects a limit above the schema maximum', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.notes.listByUser({ ...input, limit: 100000 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});
