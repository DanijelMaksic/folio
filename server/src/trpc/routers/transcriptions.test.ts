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
   mockFindFirst,
   mockSendApprovalEmail,
   mockSendRejectionEmail,
} = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockInsert: vi.fn(),
   mockUpdate: vi.fn(),
   mockFindFirst: vi.fn(),
   mockSendApprovalEmail: vi.fn(),
   mockSendRejectionEmail: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      query: {
         transcriptions: {
            findFirst: mockFindFirst,
         },
      },
   },
}));

vi.mock('@/lib/email.js', () => ({
   sendApprovalEmail: mockSendApprovalEmail,
   sendRejectionEmail: mockSendRejectionEmail,
}));

const contributorUser = mockUser({ globalRole: 'contributor' });
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const viewerUser = mockUser({ globalRole: 'viewer' });

const mockTranscription = {
   id: 'transcription-1',
   documentId: 'doc-1',
   userId: contributorUser.id,
   content: 'Some transcription content',
   status: 'draft',
   rejectionReason: null,
   createdAt: new Date(),
   updatedAt: new Date(),
};

const mockTranscriptionWithUser = {
   ...mockTranscription,
   status: 'submitted',
   user: {
      id: contributorUser.id,
      email: contributorUser.email,
      username: contributorUser.username,
   },
};

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getByDocument ───────────────────────

describe('transcriptions.getByDocument', () => {
   it('returns the transcription for the current user and document', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockTranscription]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.getByDocument({
         documentId: 'doc-1',
      });

      expect(result).toMatchObject({ id: 'transcription-1' });
   });

   it('returns null if no transcription exists', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.getByDocument({
         documentId: 'doc-1',
      });

      expect(result).toBeNull();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.getByDocument({ documentId: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── create ───────────────────────

describe('transcriptions.create', () => {
   it('returns existing transcription if one already exists', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockTranscription]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({
         documentId: 'doc-1',
      });

      expect(result).toMatchObject({ id: 'transcription-1' });
      expect(mockInsert).not.toHaveBeenCalled();
   });

   it('creates and returns a new transcription if none exists', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValueOnce([mockTranscription]),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({
         documentId: 'doc-1',
      });

      expect(result).toMatchObject({ id: 'transcription-1' });
      expect(mockInsert).toHaveBeenCalled();
   });

   it('throws FORBIDDEN if user is a viewer', async () => {
      const caller = createAuthenticatedCaller(viewerUser);
      await expect(
         caller.transcriptions.create({ documentId: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.create({ documentId: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── update ───────────────────────

describe('transcriptions.update', () => {
   it('updates content and snapshots a revision', async () => {
      const updated = { ...mockTranscription, content: 'Updated content' };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockTranscription]),
            })),
         })),
      });

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      mockInsert.mockReturnValueOnce({
         values: vi.fn().mockResolvedValueOnce(undefined),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'Updated content',
      });

      expect(result).toMatchObject({ content: 'Updated content' });
      expect(mockInsert).toHaveBeenCalled();
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'nonexistent',
            content: 'x',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if transcription belongs to another user', async () => {
      const otherUserTranscription = {
         ...mockTranscription,
         userId: 'other-user-id',
      };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([otherUserTranscription]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws FORBIDDEN if transcription is already submitted', async () => {
      const submittedTranscription = {
         ...mockTranscription,
         status: 'submitted',
      };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([submittedTranscription]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── submit ───────────────────────

describe('transcriptions.submit', () => {
   it('submits a draft transcription', async () => {
      const submitted = { ...mockTranscription, status: 'submitted' };

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([mockTranscription]),
            })),
         })),
      });

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([submitted]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.submit({
         transcriptionId: 'transcription-1',
      });

      expect(result).toMatchObject({ status: 'submitted' });
   });

   it('throws FORBIDDEN if transcription belongs to another user', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockTranscription, userId: 'other-user-id' },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws FORBIDDEN if transcription is already submitted', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockTranscription, status: 'submitted' },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws BAD_REQUEST if content is empty', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockTranscription, content: '   ' },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({ transcriptionId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.submit({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getRevisions ───────────────────────

describe('transcriptions.getRevisions', () => {
   it('returns revisions for owned transcription', async () => {
      const revisions = [
         {
            id: 'rev-1',
            transcriptionId: 'transcription-1',
            content: 'v1',
            savedAt: new Date(),
         },
      ];

      mockSelect
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce([mockTranscription]),
               })),
            })),
         })
         .mockReturnValueOnce({
            from: vi.fn(() => ({
               where: vi.fn(() => ({
                  orderBy: vi.fn().mockResolvedValueOnce(revisions),
               })),
            })),
         });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.getRevisions({
         transcriptionId: 'transcription-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'rev-1' });
   });

   it('throws FORBIDDEN if transcription belongs to another user', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi
                  .fn()
                  .mockResolvedValueOnce([
                     { ...mockTranscription, userId: 'other-user-id' },
                  ]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.getRevisions({
            transcriptionId: 'transcription-1',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce([]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.getRevisions({ transcriptionId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.getRevisions({
            transcriptionId: 'transcription-1',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── listQueue ───────────────────────

describe('transcriptions.listQueue', () => {
   it('returns submitted transcriptions for editors', async () => {
      const queue = [
         {
            id: 'transcription-1',
            documentId: 'doc-1',
            documentTitle: 'Test Doc',
            contributorUsername: 'testUser',
            status: 'submitted',
            updatedAt: new Date(),
         },
      ];

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               innerJoin: vi.fn(() => ({
                  where: vi.fn().mockResolvedValueOnce(queue),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.listQueue();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ status: 'submitted' });
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(caller.transcriptions.listQueue()).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.transcriptions.listQueue()).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});

// ── approve ───────────────────────

describe('transcriptions.approve', () => {
   it('approves a submitted transcription and sends approval email', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(undefined),
         })),
      });

      mockSendApprovalEmail.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.approve({
         transcriptionId: 'transcription-1',
      });

      expect(result).toEqual({ success: true });
      await vi.waitFor(() => {
         expect(mockSendApprovalEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: contributorUser.email }),
         );
      });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if editor tries to approve their own transcription', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         userId: editorUser.id,
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws BAD_REQUEST if transcription is not submitted', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         status: 'draft',
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── reject ───────────────────────

describe('transcriptions.reject', () => {
   it('rejects a submitted transcription and sends rejection email', async () => {
      const submitted = { ...mockTranscriptionWithUser, status: 'submitted' };
      mockFindFirst.mockResolvedValueOnce(submitted);

      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce(undefined),
         })),
      });

      mockSendRejectionEmail.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.reject({
         transcriptionId: 'transcription-1',
         reason: 'Needs more detail',
      });

      expect(result).toEqual({ success: true });
      await vi.waitFor(() => {
         expect(mockSendRejectionEmail).toHaveBeenCalledWith(
            expect.objectContaining({
               to: contributorUser.email,
               reason: 'Needs more detail',
            }),
         );
      });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'nonexistent',
            reason: 'x',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if editor tries to reject their own transcription', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         userId: editorUser.id,
         status: 'submitted',
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'x',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws BAD_REQUEST if transcription is not submitted', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         status: 'draft',
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'x',
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'x',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'x',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getSubmittedByDocument ───────────────────────

describe('transcriptions.getSubmittedByDocument', () => {
   it('returns submitted transcription for editors', async () => {
      const submitted = { ...mockTranscriptionWithUser, status: 'submitted' };
      mockFindFirst.mockResolvedValueOnce(submitted);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.getSubmittedByDocument({
         documentId: 'doc-1',
      });

      expect(result).toMatchObject({ status: 'submitted' });
   });

   it('returns null if no submitted transcription exists', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.getSubmittedByDocument({
         documentId: 'doc-1',
      });

      expect(result).toBeNull();
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.getSubmittedByDocument({ documentId: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.getSubmittedByDocument({ documentId: 'doc-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getApprovedByDocument ───────────────────────

describe('transcriptions.getApprovedByDocument', () => {
   it('returns approved transcription', async () => {
      const approved = { ...mockTranscription, status: 'approved' };
      mockFindFirst.mockResolvedValueOnce(approved);

      const caller = createUnauthenticatedCaller();
      const result = await caller.transcriptions.getApprovedByDocument({
         documentId: 'doc-1',
      });

      expect(result).toMatchObject({ status: 'approved' });
   });

   it('returns null if no approved transcription exists', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createUnauthenticatedCaller();
      const result = await caller.transcriptions.getApprovedByDocument({
         documentId: 'doc-1',
      });

      expect(result).toBeNull();
   });
});
