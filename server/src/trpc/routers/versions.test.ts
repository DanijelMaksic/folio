import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const { mockSelect } = vi.hoisted(() => ({
   mockSelect: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: { add: vi.fn() },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});

const approvedAt = new Date('2026-01-01T00:00:00Z');

const mockVersion = {
   id: 'ver-1',
   pageId: 'page-1',
   transcriptionId: 'transcription-1',
   content: 'Approved text',
   isBlank: false,
   userId: 'author-id',
   approvedAt,
   authorUsername: 'author',
   authorName: 'Author',
   authorImage: null,
   approverUsername: 'editor',
   approverName: 'Editor',
   approverImage: null,
};

const mockUserVersion = {
   id: 'ver-1',
   pageId: 'page-1',
   content: 'Approved text',
   isBlank: false,
   approvedAt,
   approverUsername: 'editor',
   documentId: 'doc-1',
   documentTitle: 'Test Document',
   pageTitle: 'Page 1',
   pageNumber: 1,
   isCurrent: true,
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().leftJoin().leftJoin().where().limit().orderBy(...)
const mockByPageQuery = (rows: unknown[]) => {
   const orderBy = vi.fn((..._args: unknown[]) => Promise.resolve(rows));
   const limit = vi.fn((_n?: number) => ({ orderBy }));
   const where = vi.fn((_where?: unknown) => ({ limit }));
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({ where })),
         })),
      })),
   });
   return { where, limit, orderBy };
};

// results: select().from().leftJoin(user).leftJoin(transcriptions)
//            .innerJoin(pages).innerJoin(documents).where()
//            .orderBy(order, tiebreak).limit().offset()
// count:   select().from().innerJoin().innerJoin().where()
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
         leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
               innerJoin: vi.fn(() => ({
                  innerJoin: vi.fn(() => ({ where: resultsWhere })),
               })),
            })),
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

describe('versions.listByPage', () => {
   const input = { pageId: 'page-1', limit: 20, sort: 'newest' } as const;

   it('returns the versions of a page with author and approver', async () => {
      mockByPageQuery([mockVersion]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByPage(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
         id: 'ver-1',
         authorUsername: 'author',
         approverUsername: 'editor',
      });
   });

   it('returns an empty list when the page has no versions', async () => {
      mockByPageQuery([]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByPage(input);

      expect(result).toEqual([]);
   });

   it('keeps versions whose author or approver was deleted', async () => {
      mockByPageQuery([
         {
            ...mockVersion,
            userId: null,
            authorUsername: null,
            authorName: null,
            approverUsername: null,
         },
      ]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByPage(input);

      expect(result[0]).toMatchObject({
         authorUsername: null,
         approverUsername: null,
      });
   });

   it('filters by page and applies the limit', async () => {
      const q = mockByPageQuery([]);

      const caller = createUnauthenticatedCaller();
      await caller.versions.listByPage({ ...input, limit: 5 });

      expect(q.where.mock.calls[0][0]).toBeDefined();
      expect(q.limit).toHaveBeenCalledWith(5);
   });

   it('orders by approvedAt plus id for both sorts', async () => {
      const newest = mockByPageQuery([]);
      const oldest = mockByPageQuery([]);

      const caller = createUnauthenticatedCaller();
      await caller.versions.listByPage({ ...input, sort: 'newest' });
      await caller.versions.listByPage({ ...input, sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
   });

   it('works for a signed-in user', async () => {
      mockByPageQuery([mockVersion]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.versions.listByPage(input)).resolves.toHaveLength(1);
   });

   it('rejects an invalid sort', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.versions.listByPage({
            ...input,
            sort: 'sideways' as unknown as 'newest',
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── listByUser ───────────────────────

describe('versions.listByUser', () => {
   const input = {
      userId: 'author-id',
      page: 1,
      limit: 20,
      sort: 'newest',
   } as const;

   it('returns the versions with pagination info', async () => {
      mockByUserQueries([mockUserVersion], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByUser(input);

      expect(result.versions).toHaveLength(1);
      expect(result.versions[0]).toMatchObject({
         documentId: 'doc-1',
         pageNumber: 1,
         isCurrent: true,
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('rounds totalPages up', async () => {
      mockByUserQueries([mockUserVersion], 45);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByUser(input);

      expect(result.totalCount).toBe(45);
      expect(result.totalPages).toBe(3);
   });

   it('returns at least one page when there are no versions', async () => {
      mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByUser(input);

      expect(result.versions).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(1);
   });

   it('marks superseded versions as not current', async () => {
      mockByUserQueries([{ ...mockUserVersion, isCurrent: false }], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByUser(input);

      expect(result.versions[0]).toMatchObject({ isCurrent: false });
   });

   it('keeps versions whose approver was deleted', async () => {
      mockByUserQueries([{ ...mockUserVersion, approverUsername: null }], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.versions.listByUser(input);

      expect(result.versions[0]).toMatchObject({ approverUsername: null });
   });

   it('uses the same where for the data and count queries', async () => {
      const q = mockByUserQueries([mockUserVersion], 1);

      const caller = createUnauthenticatedCaller();
      await caller.versions.listByUser(input);

      expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(q.resultsWhere.mock.calls[0][0]).toBe(
         q.countWhere.mock.calls[0][0],
      );
   });

   it('computes the offset from page and limit', async () => {
      const q = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.versions.listByUser({ ...input, page: 3, limit: 10 });

      expect(q.limit).toHaveBeenCalledWith(10);
      expect(q.offset).toHaveBeenCalledWith(20);
   });

   it('orders by approvedAt plus id for both sorts', async () => {
      const newest = mockByUserQueries([], 0);
      const oldest = mockByUserQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.versions.listByUser({ ...input, sort: 'newest' });
      await caller.versions.listByUser({ ...input, sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
      expect(newest.orderBy.mock.calls[0][1]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][1],
      );
   });

   it('works for a signed-in user', async () => {
      mockByUserQueries([mockUserVersion], 1);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.versions.listByUser(input);

      expect(result.versions).toHaveLength(1);
   });

   it('throws BAD_REQUEST when no userId is given', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.versions.listByUser({
            ...input,
            userId: undefined as unknown as string,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('rejects a limit above the schema maximum', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.versions.listByUser({ ...input, limit: 100000 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});
