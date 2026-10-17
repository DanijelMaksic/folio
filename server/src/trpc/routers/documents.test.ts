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
} = vi.hoisted(() => ({
   mockInsert: vi.fn(),
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
   mockUpload: vi.fn(),
   mockPdfQueue: vi.fn(),
   mockDeleteResources: vi.fn(),
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

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ globalRole: 'editor' });
const viewerUser = mockUser({ globalRole: 'viewer' });

const mockDoc = {
   id: 'doc-1',
   title: 'Test Document',
   description: 'A test document',
   uploadedBy: contributorUser.id,
   collectionId: null,
   status: 'ready',
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
};

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

beforeEach(() => {
   vi.resetAllMocks();
});

// ── upload ───────────────────────

describe('documents.upload', () => {
   it('creates a document with no pages when no file provided', async () => {
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.upload({
         title: 'Test Document',
         description: 'A test document',
      });

      expect(result).toMatchObject({ title: 'Test Document' });
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockPdfQueue).not.toHaveBeenCalled();
   });

   it('enqueues a PDF job when fileType is pdf', async () => {
      mockPdfQueue.mockResolvedValueOnce({});

      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi
               .fn()
               .mockResolvedValueOnce([{ ...mockDoc, status: 'processing' }]),
         })),
      });

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
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

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

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.documents.upload({ title: 'Test' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
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
      const mockResults = [
         {
            id: mockDoc.id,
            title: mockDoc.title,
            status: mockDoc.status,
            uploaderName: 'testUser',
            createdAt: mockDoc.createdAt,
            coverImageUrl: null,
            pageCount: 0,
         },
      ];

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

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ total: 1 }]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 20 });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toMatchObject({ title: 'Test Document' });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('returns empty list when no documents exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn(() => ({
                     offset: vi.fn(() => ({
                        orderBy: vi.fn().mockResolvedValueOnce([]),
                     })),
                  })),
               })),
            })),
         })),
      });

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ total: 0 }]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 20 });

      expect(result.documents).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
   });

   it('rejects a PDF upload without fileBase64', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.upload({ title: 'No file', fileType: 'pdf' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockPdfQueue).not.toHaveBeenCalled();
   });

   it('filters by search term', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn(() => ({
                     offset: vi.fn(() => ({
                        orderBy: vi.fn().mockResolvedValueOnce([mockDoc]),
                     })),
                  })),
               })),
            })),
         })),
      });

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ total: 1 }]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({
         page: 1,
         limit: 20,
         search: 'Test',
      });

      expect(result.documents).toHaveLength(1);
   });
});

// ── getById ───────────────────────

describe('documents.getById', () => {
   it('returns a document by id', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockDoc]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getById({ id: 'doc-1' });

      expect(result).toMatchObject({ id: 'doc-1', title: 'Test Document' });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.getById({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getByCollection ───────────────────────

describe('documents.getByCollection', () => {
   it('returns documents for a collection', async () => {
      const collectionDoc = { ...mockDoc, collectionId: 'col-1' };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([collectionDoc]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getByCollection({
         collectionId: 'col-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ collectionId: 'col-1' });
   });

   it('returns empty array if collection has no documents', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getByCollection({
         collectionId: 'empty-col',
      });

      expect(result).toHaveLength(0);
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

   it("lets an editor update someone else's document", async () => {
      const others = { ...mockDoc, uploadedBy: 'someone-else' };
      mockLookup([others]);
      mockUpdateReturning([{ ...others, title: 'Edited' }]);

      const caller = createAuthenticatedCaller(
         mockUser({ globalRole: 'editor' }),
      );
      const result = await caller.documents.update({
         id: 'doc-1',
         title: 'Edited',
      });

      expect(result).toMatchObject({ title: 'Edited' });
   });

   it('throws NOT_FOUND if the update returns no row', async () => {
      const owned = { ...mockDoc, uploadedBy: contributorUser.id };
      mockLookup([owned]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'doc-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.documents.update({ id: 'doc-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
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
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockReturnValueOnce([mockDoc]),
            })),
         })),
      });

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

   it('throws NOT_FOUND if the document does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.delete({ id: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws FORBIDDEN if user is a non-owner contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);

      // existing-row lookup: select().from().where().limit()
      mockSelect.mockReturnValueOnce({
         from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
               limit: vi
                  .fn()
                  .mockResolvedValue([
                     { id: 'doc-1', uploadedBy: 'someone-else' },
                  ]),
            }),
         }),
      });

      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      // the check must stop before touching anything destructive
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.documents.delete({ id: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── search ───────────────────────

describe('documents.search', () => {
   it('returns matching documents', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([mockDoc]),
               })),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.search({ query: 'Test' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ title: 'Test Document' });
   });

   it('returns empty array when no documents match', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([]),
               })),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.search({ query: 'nonexistent' });

      expect(result).toHaveLength(0);
   });

   it('filters by collectionId when provided', async () => {
      const collectionDoc = { ...mockDoc, collectionId: 'col-1' };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([collectionDoc]),
               })),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.search({
         query: 'Test',
         collectionId: 'col-1',
      });

      expect(result[0]).toMatchObject({ collectionId: 'col-1' });
   });
});
