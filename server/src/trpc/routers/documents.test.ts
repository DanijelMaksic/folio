import { mockUser } from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
   mockInsert,
   mockSelect,
   mockUpdate,
   mockDelete,
   mockUpload,
   mockPdfQueue,
} = vi.hoisted(() => ({
   mockInsert: vi.fn(),
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockDelete: vi.fn(),
   mockUpload: vi.fn(),
   mockPdfQueue: vi.fn(),
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

beforeEach(() => {
   vi.clearAllMocks();
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
   it('updates a document and returns it', async () => {
      const updated = { ...mockDoc, title: 'Updated Title' };

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.update({
         id: 'doc-1',
         title: 'Updated Title',
      });

      expect(result).toMatchObject({ title: 'Updated Title' });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.documents.update({ id: 'nonexistent', title: 'X' }),
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
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.delete({ id: 'doc-1' });

      expect(result).toMatchObject({ id: 'doc-1' });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([]),
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
