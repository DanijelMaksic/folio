import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const {
   mockSelect,
   mockInsert,
   mockUpdate,
   mockDelete,
   mockFindFirst,
   mockUpload,
   mockDestroy,
} = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockInsert: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
   mockFindFirst: vi.fn(),
   mockUpload: vi.fn(),
   mockDestroy: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      query: {
         documents: {
            findFirst: mockFindFirst,
         },
      },
   },
}));

vi.mock('@/lib/cloudinary.js', () => ({
   default: {
      uploader: {
         upload: mockUpload,
         destroy: mockDestroy,
      },
   },
}));

vi.mock('@/lib/email.js', () => ({
   sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });
const otherUser = mockUser({ id: 'other-user-id', globalRole: 'contributor' });

const mockPage = {
   id: 'page-1',
   documentId: 'doc-1',
   pageNumber: 1,
   title: 'Page 1',
   imageUrl: 'https://res.cloudinary.com/mock/image/upload/folio/page1.png',
   cloudinaryPublicId: 'folio/page1',
   createdAt: new Date().toISOString(),
};

const mockPageWithUploadedBy = {
   ...mockPage,
   uploadedBy: contributorUser.id,
};

const mockDocument = {
   id: 'doc-1',
   title: 'Test Document',
   uploadedBy: contributorUser.id,
   status: 'ready',
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where().limit() -> rows
const mockLimitLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

// select().from().innerJoin().where() -> rows (page + document owner)
const mockPageLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

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

// update().set().where() with no returning (renumbering); returns the set spy
const mockUpdatePlain = () => {
   const set = vi.fn((_fields?: unknown) => ({
      where: vi.fn().mockResolvedValueOnce(undefined),
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

// select max page number: select().from().where() -> [{ maxPage }]
const mockMaxPage = (maxPage: number | null) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce([{ maxPage }]),
      })),
   });

// insert().values() (no returning); returns the values spy
const mockInsertPlain = () => {
   const values = vi.fn((_values?: unknown) => Promise.resolve(undefined));
   mockInsert.mockReturnValueOnce({ values });
   return { values };
};

const uploadResult = (n: number) => ({
   secure_url: `https://res.cloudinary.com/mock/image/upload/folio/page${n}.png`,
   public_id: `folio/page${n}`,
});

// getByDocument:
//   results: select().from().leftJoin().where().groupBy().orderBy().limit().offset()
//   count:   select().from().where()
const mockByDocumentQueries = (rows: unknown[], total: number) => {
   const orderBy = vi.fn((..._args: unknown[]) => ({
      limit: vi.fn(() => ({
         offset: vi.fn().mockResolvedValueOnce(rows),
      })),
   }));
   const resultsWhere = vi.fn((_where?: unknown) => ({
      groupBy: vi.fn(() => ({ orderBy })),
   }));
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

   return { resultsWhere, countWhere, orderBy };
};

// ── getByDocument ───────────────────────

describe('pages.getByDocument', () => {
   it('returns paginated pages with approved transcription count', async () => {
      mockByDocumentQueries(
         [{ ...mockPage, approvedTranscriptionCount: 1 }],
         1,
      );

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
      });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toMatchObject({ approvedTranscriptionCount: 1 });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('returns empty pages when the document has no pages', async () => {
      mockByDocumentQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
      });

      expect(result.pages).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
   });

   it('rounds totalPages up', async () => {
      mockByDocumentQueries([mockPage], 25);

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 10,
      });

      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(3);
   });

   it('uses the same where for the data and count queries', async () => {
      const q = mockByDocumentQueries([mockPage], 1);

      const caller = createUnauthenticatedCaller();
      await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         search: 'Page 1',
         status: 'transcribed',
      });

      expect(q.resultsWhere.mock.calls[0][0]).toBeDefined();
      expect(q.resultsWhere.mock.calls[0][0]).toBe(
         q.countWhere.mock.calls[0][0],
      );
   });

   it('filters by search term', async () => {
      mockByDocumentQueries([mockPage], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         search: 'Page 1',
      });

      expect(result.pages).toHaveLength(1);
   });

   it('adds a condition when searching', async () => {
      const base = mockByDocumentQueries([], 0);
      const searched = mockByDocumentQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
      });
      await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         search: 'letter',
      });

      expect(searched.resultsWhere.mock.calls[0][0]).not.toStrictEqual(
         base.resultsWhere.mock.calls[0][0],
      );
   });

   it.each(['transcribed', 'not-transcribed'] as const)(
      'adds a condition for status %s',
      async (status) => {
         const base = mockByDocumentQueries([], 0);
         const filtered = mockByDocumentQueries([], 0);

         const caller = createUnauthenticatedCaller();
         await caller.pages.getByDocument({
            documentId: 'doc-1',
            page: 1,
            limit: 20,
         });
         await caller.pages.getByDocument({
            documentId: 'doc-1',
            page: 1,
            limit: 20,
            status,
         });

         expect(filtered.resultsWhere.mock.calls[0][0]).not.toStrictEqual(
            base.resultsWhere.mock.calls[0][0],
         );
      },
   );

   it('orders ascending and descending differently', async () => {
      const asc = mockByDocumentQueries([], 0);
      const desc = mockByDocumentQueries([], 0);

      const caller = createUnauthenticatedCaller();
      await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         sort: 'asc',
      });
      await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         sort: 'desc',
      });

      expect(asc.orderBy.mock.calls[0][0]).not.toStrictEqual(
         desc.orderBy.mock.calls[0][0],
      );
   });

   it('rejects a limit above the schema maximum', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.getByDocument({
            documentId: 'doc-1',
            page: 1,
            limit: 100000,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── getById ───────────────────────

describe('pages.getById', () => {
   it('returns a page by id', async () => {
      mockLimitLookup([mockPage]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getById({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockLimitLookup([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.getById({ pageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getByPageNumber ───────────────────────

describe('pages.getByPageNumber', () => {
   it('returns a page by document id and page number', async () => {
      mockLimitLookup([mockPage]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByPageNumber({
         documentId: 'doc-1',
         pageNumber: 1,
      });

      expect(result).toMatchObject({ pageNumber: 1 });
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockLimitLookup([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.getByPageNumber({ documentId: 'doc-1', pageNumber: 99 }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── update ───────────────────────

describe('pages.update', () => {
   it('updates a page the user owns', async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: contributorUser.id }]);
      mockUpdateReturning([{ ...mockPage, title: 'Updated Title' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.update({
         id: 'page-1',
         title: 'Updated Title',
      });

      expect(result).toMatchObject({ title: 'Updated Title' });
   });

   it('does not send id in the update fields', async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: contributorUser.id }]);
      const { set } = mockUpdateReturning([mockPage]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.pages.update({ id: 'page-1', title: 'X' });

      expect(set.mock.calls[0][0]).not.toHaveProperty('id');
      expect(set).toHaveBeenCalledWith(expect.objectContaining({ title: 'X' }));
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockPageLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'nonexistent', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if a contributor edits another user's page", async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: otherUser.id }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN for a contributor when the uploader was deleted', async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s edit another user's page",
      async (role) => {
         mockPageLookup([{ id: 'page-1', uploadedBy: otherUser.id }]);
         mockUpdateReturning([{ ...mockPage, title: 'Edited' }]);

         const caller = createAuthenticatedCaller(
            role === 'editor' ? editorUser : adminUser,
         );
         const result = await caller.pages.update({
            id: 'page-1',
            title: 'Edited',
         });

         expect(result).toMatchObject({ title: 'Edited' });
      },
   );

   it('throws NOT_FOUND if the update returns no row', async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: contributorUser.id }]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── delete ───────────────────────

describe('pages.delete', () => {
   it('deletes a page, renumbers the rest and destroys the image', async () => {
      mockPageLookup([mockPageWithUploadedBy]);
      mockDeleteReturning([mockPage]);
      const { set } = mockUpdatePlain();
      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.delete({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
      expect(mockDestroy).toHaveBeenCalledWith('folio/page1');
      // renumbering touches both pageNumber and title
      expect(set.mock.calls[0][0]).toHaveProperty('pageNumber');
      expect(set.mock.calls[0][0]).toHaveProperty('title');
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockPageLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.delete({ pageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if a contributor deletes another user's page", async () => {
      mockPageLookup([{ ...mockPageWithUploadedBy, uploadedBy: otherUser.id }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockDestroy).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s delete another user's page",
      async (role) => {
         mockPageLookup([
            { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
         ]);
         mockDeleteReturning([mockPage]);
         mockUpdatePlain();
         mockDestroy.mockResolvedValueOnce({ result: 'ok' });

         const caller = createAuthenticatedCaller(
            role === 'editor' ? editorUser : adminUser,
         );
         const result = await caller.pages.delete({ pageId: 'page-1' });

         expect(result).toMatchObject({ id: 'page-1' });
      },
   );

   it('throws NOT_FOUND and skips renumbering when the delete returns no row', async () => {
      mockPageLookup([mockPageWithUploadedBy]);
      mockDeleteReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockDestroy).not.toHaveBeenCalled();
   });

   it('still deletes the page when destroying the image fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPageLookup([mockPageWithUploadedBy]);
      mockDeleteReturning([mockPage]);
      mockUpdatePlain();
      mockDestroy.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.delete({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── addPages ───────────────────────

describe('pages.addPages', () => {
   it('uploads an image and inserts a page after the current max', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);
      mockMaxPage(2);
      mockUpload.mockResolvedValueOnce(uploadResult(3));
      const { values } = mockInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.addPages({
         documentId: 'doc-1',
         files: ['data:image/png;base64,abc123'],
      });

      expect(result).toEqual({ added: 1 });
      expect(mockUpload).toHaveBeenCalledWith('data:image/png;base64,abc123', {
         folder: 'folio/documents',
         resource_type: 'image',
      });
      expect(values).toHaveBeenCalledWith({
         documentId: 'doc-1',
         pageNumber: 3,
         title: 'Page 3',
         imageUrl: uploadResult(3).secure_url,
         cloudinaryPublicId: 'folio/page3',
      });
   });

   it('numbers several files consecutively', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);
      mockMaxPage(2);
      mockUpload
         .mockResolvedValueOnce(uploadResult(3))
         .mockResolvedValueOnce(uploadResult(4));
      const first = mockInsertPlain();
      const second = mockInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.addPages({
         documentId: 'doc-1',
         files: ['data:image/png;base64,a', 'data:image/png;base64,b'],
      });

      expect(result).toEqual({ added: 2 });
      expect(first.values).toHaveBeenCalledWith(
         expect.objectContaining({ pageNumber: 3, title: 'Page 3' }),
      );
      expect(second.values).toHaveBeenCalledWith(
         expect.objectContaining({ pageNumber: 4, title: 'Page 4' }),
      );
   });

   it('starts at page 1 when the document has no pages', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);
      mockMaxPage(null);
      mockUpload.mockResolvedValueOnce(uploadResult(1));
      const { values } = mockInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.addPages({
         documentId: 'doc-1',
         files: ['data:image/png;base64,abc123'],
      });

      expect(result).toEqual({ added: 1 });
      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ pageNumber: 1, title: 'Page 1' }),
      );
   });

   it('rejects when an upload fails midway and stops uploading', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);
      mockMaxPage(0);
      mockUpload
         .mockResolvedValueOnce(uploadResult(1))
         .mockRejectedValueOnce(new Error('cloudinary down'));
      mockInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.addPages({
            documentId: 'doc-1',
            files: [
               'data:image/png;base64,a',
               'data:image/png;base64,b',
               'data:image/png;base64,c',
            ],
         }),
      ).rejects.toThrow();

      expect(mockUpload).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledTimes(1);
   });

   it('throws NOT_FOUND if the document does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.addPages({
            documentId: 'nonexistent',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpload).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if a contributor adds pages to another user's document", async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockDocument,
         uploadedBy: otherUser.id,
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.addPages({
            documentId: 'doc-1',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s add pages to another user's document",
      async (role) => {
         mockFindFirst.mockResolvedValueOnce({
            ...mockDocument,
            uploadedBy: otherUser.id,
         });
         mockMaxPage(2);
         mockUpload.mockResolvedValueOnce(uploadResult(3));
         mockInsertPlain();

         const caller = createAuthenticatedCaller(
            role === 'editor' ? editorUser : adminUser,
         );
         const result = await caller.pages.addPages({
            documentId: 'doc-1',
            files: ['data:image/png;base64,abc123'],
         });

         expect(result).toEqual({ added: 1 });
      },
   );

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.addPages({
            documentId: 'doc-1',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── replaceImage ───────────────────────

describe('pages.replaceImage', () => {
   const newUpload = {
      secure_url: 'https://res.cloudinary.com/mock/image/upload/folio/new.png',
      public_id: 'folio/new',
   };

   it('uploads the new image, updates the page and destroys the old image', async () => {
      mockPageLookup([mockPageWithUploadedBy]);
      mockUpload.mockResolvedValueOnce(newUpload);
      const { set } = mockUpdateReturning([
         {
            ...mockPage,
            imageUrl: newUpload.secure_url,
            cloudinaryPublicId: 'folio/new',
         },
      ]);
      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.replaceImage({
         pageId: 'page-1',
         fileBase64: 'data:image/png;base64,newimage',
      });

      expect(result).toMatchObject({ cloudinaryPublicId: 'folio/new' });
      expect(mockUpload).toHaveBeenCalledWith(
         'data:image/png;base64,newimage',
         { folder: 'folio/documents', resource_type: 'image' },
      );
      expect(set).toHaveBeenCalledWith({
         imageUrl: newUpload.secure_url,
         cloudinaryPublicId: 'folio/new',
      });
      // only the OLD image is destroyed on success
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(mockDestroy).toHaveBeenCalledWith('folio/page1');
   });

   it('throws NOT_FOUND if the page does not exist', async () => {
      mockPageLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'nonexistent',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpload).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if a contributor replaces another user's image", async () => {
      mockPageLookup([{ ...mockPageWithUploadedBy, uploadedBy: otherUser.id }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s replace another user's image",
      async (role) => {
         mockPageLookup([
            { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
         ]);
         mockUpload.mockResolvedValueOnce(newUpload);
         mockUpdateReturning([mockPage]);
         mockDestroy.mockResolvedValueOnce({ result: 'ok' });

         const caller = createAuthenticatedCaller(
            role === 'editor' ? editorUser : adminUser,
         );
         const result = await caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         });

         expect(result).toMatchObject({ id: 'page-1' });
      },
   );

   it('keeps the old image when the new upload fails', async () => {
      mockPageLookup([mockPageWithUploadedBy]);
      mockUpload.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toThrow();

      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('destroys only the new image when the DB update fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPageLookup([mockPageWithUploadedBy]);
      mockUpload.mockResolvedValueOnce(newUpload);
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockRejectedValueOnce(new Error('db down')),
            })),
         })),
      });
      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toThrow('db down');

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(mockDestroy).toHaveBeenCalledWith('folio/new');
   });

   it('destroys the new image and throws NOT_FOUND when the page vanished', async () => {
      mockPageLookup([mockPageWithUploadedBy]);
      mockUpload.mockResolvedValueOnce(newUpload);
      mockUpdateReturning([]);
      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(mockDestroy).toHaveBeenCalledWith('folio/new');
   });

   it('still succeeds when destroying the old image fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockPageLookup([mockPageWithUploadedBy]);
      mockUpload.mockResolvedValueOnce(newUpload);
      mockUpdateReturning([{ ...mockPage, cloudinaryPublicId: 'folio/new' }]);
      mockDestroy.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.replaceImage({
         pageId: 'page-1',
         fileBase64: 'data:image/png;base64,abc',
      });

      expect(result).toMatchObject({ cloudinaryPublicId: 'folio/new' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
