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
const editorUser = mockUser({ globalRole: 'editor' });
const viewerUser = mockUser({ globalRole: 'viewer' });
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

// ── getByDocument ───────────────────────

describe('pages.getByDocument', () => {
   it('returns paginated pages with approved transcription count', async () => {
      const mockResults = [{ ...mockPage, approvedTranscriptionCount: 1 }];

      mockSelect
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                     groupBy: vi.fn(() => ({
                        orderBy: vi.fn(() => ({
                           limit: vi.fn(() => ({
                              offset: vi
                                 .fn()
                                 .mockResolvedValueOnce(mockResults),
                           })),
                        })),
                     })),
                  })),
               })),
            })),
         })
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([{ total: 1 }]),
            })),
         });

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

   it('returns empty pages when document has no pages', async () => {
      mockSelect
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                     groupBy: vi.fn(() => ({
                        orderBy: vi.fn(() => ({
                           limit: vi.fn(() => ({
                              offset: vi.fn().mockResolvedValueOnce([]),
                           })),
                        })),
                     })),
                  })),
               })),
            })),
         })
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([{ total: 0 }]),
            })),
         });

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
      });

      expect(result.pages).toHaveLength(0);
      expect(result.totalCount).toBe(0);
   });

   it('filters by search term', async () => {
      mockSelect
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                     groupBy: vi.fn(() => ({
                        orderBy: vi.fn(() => ({
                           limit: vi.fn(() => ({
                              offset: vi.fn().mockResolvedValueOnce([mockPage]),
                           })),
                        })),
                     })),
                  })),
               })),
            })),
         })
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([{ total: 1 }]),
            })),
         });

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByDocument({
         documentId: 'doc-1',
         page: 1,
         limit: 20,
         search: 'Page 1',
      });

      expect(result.pages).toHaveLength(1);
   });
});

// ── getById ───────────────────────

describe('pages.getById', () => {
   it('returns a page by id', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockPage]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getById({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.getById({ pageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getByPageNumber ───────────────────────

describe('pages.getByPageNumber', () => {
   it('returns a page by document id and page number', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockPage]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      const result = await caller.pages.getByPageNumber({
         documentId: 'doc-1',
         pageNumber: 1,
      });

      expect(result).toMatchObject({ pageNumber: 1 });
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.getByPageNumber({ documentId: 'doc-1', pageNumber: 99 }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── update ───────────────────────

const mockPageLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(rows),
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

   it('throws NOT_FOUND if page does not exist', async () => {
      mockPageLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'nonexistent', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it("throws FORBIDDEN if contributor edits another user's page", async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: otherUser.id }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it("lets an editor edit another user's page", async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: otherUser.id }]);
      mockUpdateReturning([{ ...mockPage, title: 'Edited' }]);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.pages.update({
         id: 'page-1',
         title: 'Edited',
      });

      expect(result).toMatchObject({ title: 'Edited' });
   });

   it('throws NOT_FOUND if the update returns no row', async () => {
      mockPageLookup([{ id: 'page-1', uploadedBy: contributorUser.id }]);
      mockUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.pages.update({ id: 'page-1', title: 'X' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
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
   it('deletes a page, destroys cloudinary image, and renumbers remaining pages', async () => {
      // First select: get page with uploadedBy
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
            })),
         })),
      });

      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockPage]),
         })),
      });

      // update for renumbering
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(undefined),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.delete({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
      expect(mockDestroy).toHaveBeenCalledWith('folio/page1');
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.delete({ pageId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it("throws FORBIDDEN if contributor tries to delete another user's page", async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it("allows editor to delete another user's page", async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
                  ]),
            })),
         })),
      });

      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockPage]),
         })),
      });

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(undefined),
         })),
      });

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.pages.delete({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.delete({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });

   it('still deletes the page when destroying the image fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
            })),
         })),
      });
      mockDelete.mockReturnValueOnce({
         where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockPage]),
         })),
      });
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(undefined),
         })),
      });
      mockDestroy.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.delete({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'page-1' });
   });
});

// ── addPages ───────────────────────

describe('pages.addPages', () => {
   it('uploads images and inserts pages starting after the current max', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);

      // select for max page number
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ maxPage: 2 }]),
         })),
      });

      mockUpload.mockResolvedValueOnce({
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/page3.png',
         public_id: 'folio/page3',
      });

      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockResolvedValueOnce(undefined),
      });

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
   });

   it('starts at page 1 when document has no pages', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ maxPage: null }]),
         })),
      });

      mockUpload.mockResolvedValueOnce({
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/page1.png',
         public_id: 'folio/page1',
      });

      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.addPages({
         documentId: 'doc-1',
         files: ['data:image/png;base64,abc123'],
      });

      expect(result).toEqual({ added: 1 });
   });

   it('throws NOT_FOUND if document does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.addPages({
            documentId: 'nonexistent',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      mockFindFirst.mockResolvedValueOnce(mockDocument);

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.pages.addPages({
            documentId: 'doc-1',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.pages.addPages({
            documentId: 'doc-1',
            files: ['data:image/png;base64,abc123'],
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });

   it("throws FORBIDDEN if contributor adds pages to another user's document", async () => {
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
   });

   it("lets an editor add pages to another user's document", async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockDocument,
         uploadedBy: otherUser.id,
      });
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ maxPage: 2 }]),
         })),
      });
      mockUpload.mockResolvedValueOnce({
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/p3.png',
         public_id: 'folio/p3',
      });
      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.pages.addPages({
         documentId: 'doc-1',
         files: ['data:image/png;base64,abc123'],
      });

      expect(result).toEqual({ added: 1 });
   });
});

// ── replaceImage ───────────────────────

const mockOwnedPageLookup = () =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
         })),
      })),
   });

describe('pages.replaceImage', () => {
   it('destroys old image, uploads new one, and returns updated page', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
            })),
         })),
      });

      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      mockUpload.mockResolvedValueOnce({
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/new.png',
         public_id: 'folio/new',
      });

      const updatedPage = {
         ...mockPage,
         imageUrl: 'https://res.cloudinary.com/mock/image/upload/folio/new.png',
         cloudinaryPublicId: 'folio/new',
      };

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updatedPage]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.replaceImage({
         pageId: 'page-1',
         fileBase64: 'data:image/png;base64,newimage',
      });

      expect(result).toMatchObject({ cloudinaryPublicId: 'folio/new' });
      expect(mockDestroy).toHaveBeenCalledWith('folio/page1');
      expect(mockUpload).toHaveBeenCalledWith(
         'data:image/png;base64,newimage',
         {
            folder: 'folio/documents',
            resource_type: 'image',
         },
      );
   });

   it('throws NOT_FOUND if page does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'nonexistent',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it("throws FORBIDDEN if contributor tries to replace another user's page image", async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValueOnce([mockPageWithUploadedBy]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.pages.replaceImage({
            pageId: 'page-1',
            fileBase64: 'data:image/png;base64,abc',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it("allows editor to replace another user's page image", async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockPageWithUploadedBy, uploadedBy: otherUser.id },
                  ]),
            })),
         })),
      });

      mockDestroy.mockResolvedValueOnce({ result: 'ok' });

      mockUpload.mockResolvedValueOnce({
         secure_url:
            'https://res.cloudinary.com/mock/image/upload/folio/new.png',
         public_id: 'folio/new',
      });

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([mockPage]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.pages.replaceImage({
         pageId: 'page-1',
         fileBase64: 'data:image/png;base64,abc',
      });

      expect(result).toMatchObject({ id: 'page-1' });
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

   it('keeps the old image when the new upload fails', async () => {
      mockOwnedPageLookup();
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
      mockOwnedPageLookup();
      mockUpload.mockResolvedValueOnce({
         secure_url: 'https://x/new.png',
         public_id: 'folio/new',
      });
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
      ).rejects.toThrow();

      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(mockDestroy).toHaveBeenCalledWith('folio/new');
   });

   it('still succeeds when destroying the old image fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOwnedPageLookup();
      mockUpload.mockResolvedValueOnce({
         secure_url: 'https://x/new.png',
         public_id: 'folio/new',
      });
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockPage, cloudinaryPublicId: 'folio/new' },
                  ]),
            })),
         })),
      });
      mockDestroy.mockRejectedValueOnce(new Error('cloudinary down'));

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.pages.replaceImage({
         pageId: 'page-1',
         fileBase64: 'data:image/png;base64,abc',
      });

      expect(result).toMatchObject({ cloudinaryPublicId: 'folio/new' });
   });
});
