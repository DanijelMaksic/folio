import { mockUser } from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { PDF_MAX_BASE64_LENGTH } from '@folio/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
   mockInsert,
   mockSelect,
   mockUpdate,
   mockDelete,
   mockUpload,
   mockPdfQueue,
   mockDeleteResources,
   mockGetDocumentProgress,
} = vi.hoisted(() => ({
   mockInsert: vi.fn(),
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
   mockUpload: vi.fn(),
   mockPdfQueue: vi.fn(),
   mockDeleteResources: vi.fn(),
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

vi.mock('@/lib/cloudinary.js', () => ({
   default: {
      uploader: {
         upload: mockUpload,
      },
      api: { delete_resources: mockDeleteResources },
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: {
      add: mockPdfQueue,
   },
}));

vi.mock('@/lib/transcription-progress.js', () => ({
   getDocumentProgress: mockGetDocumentProgress,
}));

const contributorUser = mockUser({ globalRole: 'contributor' });

const mockDoc = {
   id: 'doc-1',
   title: 'Test Document',
   description: 'A test document',
   uploadedBy: contributorUser.id,
   collectionId: null,
   categoryId: null,
   status: 'ready',
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where().limit() -> rows
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

// insert().values().returning(); returns the values spy
const mockInsertReturning = (rows: unknown[]) => {
   const values = vi.fn((_values?: unknown) => ({
      returning: vi.fn().mockResolvedValueOnce(rows),
   }));
   mockInsert.mockReturnValueOnce({ values });
   return { values };
};

// The router builds the results query first, then the count query.
// Both are select().from().leftJoin(user).leftJoin(categories).where(...).
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

// select().from().leftJoin().leftJoin().where() -> rows
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

// ── upload ───────────────────────

describe('documents.upload', () => {
   it('creates a document with no pages when no file provided', async () => {
      mockInsertReturning([mockDoc]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.upload({
         title: 'Test Document',
         description: 'A test document',
      });

      expect(result).toMatchObject({ title: 'Test Document' });
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockPdfQueue).not.toHaveBeenCalled();
   });

   it('saves categoryId on a document with no files', async () => {
      mockCategoryExists(true);
      const { values } = mockInsertReturning([
         { ...mockDoc, categoryId: 'cat-1' },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.upload({
         title: 'Test Document',
         categoryId: 'cat-1',
      });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: 'cat-1', status: 'ready' }),
      );
   });

   it('stores categoryId as null when none is given', async () => {
      const { values } = mockInsertReturning([mockDoc]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.upload({ title: 'Test Document' });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: null }),
      );
      // no category given -> no category lookup
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('enqueues a PDF job when fileType is pdf', async () => {
      mockPdfQueue.mockResolvedValueOnce({});
      mockInsertReturning([{ ...mockDoc, status: 'processing' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.upload({
         title: 'Test Document',
         fileType: 'pdf',
         fileBase64: 'data:application/pdf;base64,abc123',
      });

      expect(result).toMatchObject({ status: 'processing' });
      expect(mockPdfQueue).toHaveBeenCalledWith('process-pdf', {
         documentId: mockDoc.id,
         fileBase64: 'data:application/pdf;base64,abc123',
      });
      expect(mockUpload).not.toHaveBeenCalled();
   });

   it('saves categoryId on a PDF upload', async () => {
      mockCategoryExists(true);
      mockPdfQueue.mockResolvedValueOnce({});
      const { values } = mockInsertReturning([
         { ...mockDoc, status: 'processing', categoryId: 'cat-1' },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.upload({
         title: 'Test Document',
         fileType: 'pdf',
         fileBase64: 'data:application/pdf;base64,abc123',
         categoryId: 'cat-1',
      });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({
            categoryId: 'cat-1',
            status: 'processing',
         }),
      );
   });

   it('rejects a PDF upload without fileBase64', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.upload({ title: 'No file', fileType: 'pdf' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockPdfQueue).not.toHaveBeenCalled();
   });

   it('rejects a PDF over the size cap', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.upload({
            title: 'Big',
            fileType: 'pdf',
            fileBase64: 'a'.repeat(PDF_MAX_BASE64_LENGTH + 1),
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockPdfQueue).not.toHaveBeenCalled();
   });

   it('uploads images and inserts pages when fileType is image', async () => {
      mockUpload.mockResolvedValue({
         public_id: 'folio/abc123',
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/abc123',
      });

      // First insert: document
      mockInsertReturning([mockDoc]);
      // Second insert: page
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => Promise.resolve()),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.upload({
         title: 'Test Document',
         fileType: 'image',
         files: ['data:image/png;base64,abc123'],
      });

      expect(result).toMatchObject({ title: 'Test Document', status: 'ready' });
      expect(mockUpload).toHaveBeenCalledWith('data:image/png;base64,abc123', {
         folder: 'folio/documents',
         resource_type: 'image',
      });
   });

   it('saves categoryId on an image upload', async () => {
      mockCategoryExists(true);
      mockUpload.mockResolvedValue({
         public_id: 'folio/abc123',
         secure_url: 'https://res.cloudinary.com/mock/image/upload/abc123',
      });
      const { values } = mockInsertReturning([
         { ...mockDoc, categoryId: 'cat-1' },
      ]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => Promise.resolve()),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.upload({
         title: 'Test Document',
         fileType: 'image',
         files: ['data:image/png;base64,abc123'],
         categoryId: 'cat-1',
      });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: 'cat-1', status: 'ready' }),
      );
   });

   it('rolls back the document and images when a page insert fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpload.mockResolvedValue({
         public_id: 'folio/abc123',
         secure_url: 'https://res.cloudinary.com/mock/image/upload/abc123',
      });
      mockInsertReturning([mockDoc]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => Promise.reject(new Error('db down'))),
      });
      mockDelete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({}) });
      mockDeleteResources.mockResolvedValueOnce({});

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.upload({
            title: 'Test Document',
            fileType: 'image',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });

      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteResources).toHaveBeenCalledWith(['folio/abc123']);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.upload({ title: 'Test' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── list ───────────────────────

describe('documents.list', () => {
   it('returns a paginated list of documents', async () => {
      mockListQueries(
         [
            {
               id: mockDoc.id,
               title: mockDoc.title,
               status: mockDoc.status,
               uploaderName: 'testUser',
               createdAt: mockDoc.createdAt,
               coverImageUrl: null,
               pageCount: 0,
               categoryId: null,
               categoryName: null,
               categorySlug: null,
            },
         ],
         1,
      );

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 20 });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toMatchObject({ title: 'Test Document' });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('returns an empty list when no documents exist', async () => {
      mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 20 });

      expect(result.documents).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
   });

   it('rounds totalPages up', async () => {
      mockListQueries([mockDoc], 25);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 10 });

      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(3);
   });

   it('joins user and categories in both the data and count queries', async () => {
      const q = mockListQueries([mockDoc], 1);

      const caller = createUnauthenticatedCaller();
      await caller.documents.list({ page: 1, limit: 20 });

      expect(q.resultsOuterJoin).toHaveBeenCalledTimes(1);
      expect(q.resultsInnerJoin).toHaveBeenCalledTimes(1);
      expect(q.countOuterJoin).toHaveBeenCalledTimes(1);
      expect(q.countInnerJoin).toHaveBeenCalledTimes(1);
   });

   it('uses the same where for the data and count queries', async () => {
      const q = mockListQueries([mockDoc], 1);

      const caller = createUnauthenticatedCaller();
      await caller.documents.list({
         page: 1,
         limit: 20,
         search: 'Test',
         categorySlug: 'letters',
      });

      expect(q.resultsWhere.mock.calls[0][0]).toBe(
         q.countWhere.mock.calls[0][0],
      );
   });

   it('accepts a search term', async () => {
      mockListQueries([mockDoc], 1);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({
         page: 1,
         limit: 20,
         search: 'Test',
      });

      expect(result.documents).toHaveLength(1);
   });

   it('adds a condition when categorySlug is given', async () => {
      const base = mockListQueries([mockDoc], 1);
      const filtered = mockListQueries([mockDoc], 1);

      const caller = createUnauthenticatedCaller();
      await caller.documents.list({ page: 1, limit: 20 });
      await caller.documents.list({
         page: 1,
         limit: 20,
         categorySlug: 'letters',
      });

      expect(filtered.resultsWhere.mock.calls[0][0]).not.toStrictEqual(
         base.resultsWhere.mock.calls[0][0],
      );
   });

   it('returns an empty list for an unknown category slug', async () => {
      mockListQueries([], 0);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({
         page: 1,
         limit: 20,
         categorySlug: 'does-not-exist',
      });

      expect(result.documents).toHaveLength(0);
      expect(result.totalCount).toBe(0);
   });

   it.each(['transcribed', 'not-transcribed'] as const)(
      'adds a condition for status %s',
      async (status) => {
         const base = mockListQueries([mockDoc], 1);
         const filtered = mockListQueries([mockDoc], 1);

         const caller = createUnauthenticatedCaller();
         await caller.documents.list({ page: 1, limit: 20 });
         await caller.documents.list({ page: 1, limit: 20, status });

         expect(filtered.resultsWhere.mock.calls[0][0]).not.toStrictEqual(
            base.resultsWhere.mock.calls[0][0],
         );
         expect(filtered.resultsWhere.mock.calls[0][0]).toBe(
            filtered.countWhere.mock.calls[0][0],
         );
      },
   );

   it('works without collectionId and with it', async () => {
      mockListQueries([mockDoc], 1);
      mockListQueries([{ ...mockDoc, collectionId: 'col-1' }], 1);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.list({ page: 1, limit: 20 }),
      ).resolves.toBeDefined();

      const result = await caller.documents.list({
         page: 1,
         limit: 100,
         collectionId: 'col-1',
      });
      expect(result.documents[0]).toMatchObject({ collectionId: 'col-1' });
   });

   it('rejects a limit above 100', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.list({ page: 1, limit: 101 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── getById ───────────────────────

describe('documents.getById', () => {
   it('returns a document by id', async () => {
      mockGetByIdQuery([mockDoc]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getById({ id: 'doc-1' });

      expect(result).toMatchObject({ id: 'doc-1', title: 'Test Document' });
   });

   it('returns the category fields', async () => {
      mockGetByIdQuery([
         {
            ...mockDoc,
            categoryId: 'cat-1',
            categoryName: 'Letters',
            categorySlug: 'letters',
         },
      ]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getById({ id: 'doc-1' });

      expect(result).toMatchObject({
         categoryId: 'cat-1',
         categoryName: 'Letters',
         categorySlug: 'letters',
      });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockGetByIdQuery([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.getById({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getStats ───────────────────────

describe('documents.getStats', () => {
   it('returns progress for a visible document', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ id: 'doc-1' }]),
         })),
      });
      const progress = { totalPages: 4, transcribedPages: 2 };
      mockGetDocumentProgress.mockResolvedValueOnce(progress);

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getStats({ id: 'doc-1' });

      expect(result).toEqual(progress);
      expect(mockGetDocumentProgress).toHaveBeenCalledWith('doc-1');
   });

   it('throws NOT_FOUND when the document is missing or hidden', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.getStats({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockGetDocumentProgress).not.toHaveBeenCalled();
   });
});

// ── update ───────────────────────

describe('documents.update', () => {
   it('updates a document the user owns', async () => {
      const owned = { ...mockDoc, uploadedBy: contributorUser.id };
      mockLookup([owned]);
      mockUpdateReturning([{ ...owned, title: 'Updated Title' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.update({
         id: 'doc-1',
         title: 'Updated Title',
      });

      expect(result).toMatchObject({ title: 'Updated Title' });
   });

   it('does not look up a category when categoryId is not sent', async () => {
      const owned = { ...mockDoc, uploadedBy: contributorUser.id };
      mockLookup([owned]);
      mockUpdateReturning([owned]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.update({ id: 'doc-1', title: 'X' });

      // only the ownership lookup
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('sets a valid category', async () => {
      const owned = { ...mockDoc, uploadedBy: contributorUser.id };
      mockCategoryExists(true);
      mockLookup([owned]);
      const { set } = mockUpdateReturning([{ ...owned, categoryId: 'cat-1' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.update({
         id: 'doc-1',
         categoryId: 'cat-1',
      });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: 'cat-1' }),
      );
      expect(result).toMatchObject({ categoryId: 'cat-1' });
   });

   it('clears the category when categoryId is null', async () => {
      const owned = {
         ...mockDoc,
         uploadedBy: contributorUser.id,
         categoryId: 'cat-1',
      };
      mockLookup([owned]); // no category lookup for null
      const { set } = mockUpdateReturning([{ ...owned, categoryId: null }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.documents.update({ id: 'doc-1', categoryId: null });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ categoryId: null }),
      );
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('rejects an unknown category before touching the document', async () => {
      mockCategoryExists(false);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'doc-1', categoryId: 'missing' }),
      ).rejects.toMatchObject({
         code: 'BAD_REQUEST',
         message: 'Unknown category',
      });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if the document does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'nonexistent', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if a contributor edits someone else's document", async () => {
      mockLookup([{ ...mockDoc, uploadedBy: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'doc-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it.each(['editor', 'admin'] as const)(
      "lets an %s update someone else's document",
      async (role) => {
         const others = { ...mockDoc, uploadedBy: 'someone-else' };
         mockLookup([others]);
         mockUpdateReturning([{ ...others, title: 'Edited' }]);

         const caller = createAuthenticatedCaller(
            mockUser({ globalRole: role }),
         );
         const result = await caller.documents.update({
            id: 'doc-1',
            title: 'Edited',
         });

         expect(result).toMatchObject({ title: 'Edited' });
      },
   );

   it('throws NOT_FOUND if the update returns no row', async () => {
      const owned = { ...mockDoc, uploadedBy: contributorUser.id };
      mockLookup([owned]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'doc-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.update({ id: 'doc-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── delete ───────────────────────

describe('documents.delete', () => {
   it('deletes a document and returns it', async () => {
      mockLookup([mockDoc]);

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ publicId: 'folio/abc' }]),
         })),
      });
      mockDeleteResources.mockResolvedValueOnce({});

      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.delete({ id: 'doc-1' });

      expect(result).toMatchObject({ id: 'doc-1' });
      expect(mockDeleteResources).toHaveBeenCalledWith(['folio/abc']);
   });

   it('still succeeds when Cloudinary cleanup fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLookup([mockDoc]);
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ publicId: 'folio/abc' }]),
         })),
      });
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });
      mockDeleteResources.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).resolves.toMatchObject({ id: 'doc-1' });
   });

   it('throws NOT_FOUND if the document does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.delete({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if user is a non-owner contributor', async () => {
      mockLookup([{ id: 'doc-1', uploadedBy: 'someone-else' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      // the check must stop before touching anything destructive
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it("lets an editor delete someone else's document", async () => {
      mockLookup([{ id: 'doc-1', uploadedBy: 'someone-else' }]);
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([]),
         })),
      });
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createAuthenticatedCaller(
         mockUser({ globalRole: 'editor' }),
      );
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).resolves.toMatchObject({ id: 'doc-1' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
