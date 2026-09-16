import { mockUser } from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInsert, mockSelect, mockUpdate, mockDelete, mockUpload } =
   vi.hoisted(() => ({
      mockInsert: vi.fn(),
      mockSelect: vi.fn(),
      mockUpdate: vi.fn(),
      mockDelete: vi.fn(),
      mockUpload: vi.fn(),
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

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ globalRole: 'editor' });
const viewerUser = mockUser({ globalRole: 'viewer' });

const mockDoc = {
   id: 'doc-1',
   title: 'Test Document',
   description: 'A test document',
   uploadedBy: contributorUser.id,
   collectionId: null,
   cloudinaryPublicId: 'folio/abc123',
   cloudinaryUrl: 'https://res.cloudinary.com/mock/image/upload/folio/abc123',
   status: 'ready',
   createdAt: new Date(),
   uploadedAt: new Date(),
};

beforeEach(() => {
   vi.clearAllMocks();
});

// ── upload ───────────────────────

describe('documents.upload', () => {
   it('uploads a document and returns it', async () => {
      mockUpload.mockResolvedValueOnce({
         public_id: 'folio/abc123',
         secure_url: mockDoc.cloudinaryUrl,
      });

      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.documents.upload({
         title: 'Test Document',
         description: 'A test document',
         fileBase64: 'data:image/png;base64,abc123',
      });

      expect(result).toMatchObject({ title: 'Test Document' });
      expect(mockUpload).toHaveBeenCalledWith('data:image/png;base64,abc123', {
         folder: 'folio/documents',
         resource_type: 'auto',
      });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);

      await expect(
         caller.documents.upload({
            title: 'Test',
            description: '',
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();

      await expect(
         caller.documents.upload({
            title: 'Test',
            description: '',
            fileBase64: 'data:image/png;base64,abc123',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── list ───────────────────────

describe('documents.list', () => {
   it('returns a list of documents', async () => {
      const mockResults = [
         {
            id: mockDoc.id,
            title: mockDoc.title,
            status: mockDoc.status,
            cloudinaryUrl: mockDoc.cloudinaryUrl,
            uploaderName: 'testUser',
            createdAt: mockDoc.createdAt,
            hasApprovedTranscription: false,
         },
      ];

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               leftJoin: vi.fn(() => ({
                  limit: vi.fn(() => ({
                     offset: vi.fn(() => ({
                        orderBy: vi.fn().mockResolvedValueOnce(mockResults),
                     })),
                  })),
               })),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.list({ page: 1, limit: 20 });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ title: 'Test Document' });
   });
});

// ── getById ───────────────────────

describe('documents.getById', () => {
   it('returns a document by id', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([mockDoc]),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.documents.getById({ id: 'doc-1' });

      expect(result).toMatchObject({ id: 'doc-1', title: 'Test Document' });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([]),
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
         caller.documents.update({ id: 'doc-1' }),
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
