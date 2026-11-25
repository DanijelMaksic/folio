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
   mockTransaction,
   mockFindFirst,
   txSelect,
   txInsert,
   txUpdate,
   txDelete,
   mockSendApprovalEmail,
   mockSendRejectionEmail,
} = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockInsert: vi.fn(),
   mockUpdate: vi.fn(),
   mockTransaction: vi.fn(),
   mockFindFirst: vi.fn(),
   txSelect: vi.fn(),
   txInsert: vi.fn(),
   txUpdate: vi.fn(),
   txDelete: vi.fn(),
   mockSendApprovalEmail: vi.fn(),
   mockSendRejectionEmail: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      transaction: mockTransaction,
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
const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });

const mockTranscription = {
   id: 'transcription-1',
   pageId: 'page-1',
   userId: contributorUser.id,
   content: 'Some transcription content',
   isBlank: false,
   status: 'draft',
   rejectionReason: null,
   createdAt: new Date().toISOString(),
   updatedAt: new Date().toISOString(),
};

const mockTranscriptionWithUser = {
   ...mockTranscription,
   status: 'submitted',
   user: {
      id: contributorUser.id,
      email: contributorUser.email,
      username: contributorUser.username,
   },
   page: {
      id: 'page-1',
      documentId: 'doc-1',
   },
};

beforeEach(() => {
   vi.resetAllMocks();
   mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
         select: txSelect,
         insert: txInsert,
         update: txUpdate,
         delete: txDelete,
      }),
   );
});

// ── helpers ───────────────────────

// db.select().from().where().limit() -> rows
const mockLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

// tx.select().from().where().limit() -> rows
const mockTxLookup = (rows: unknown[]) =>
   txSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce(rows),
         })),
      })),
   });

// tx.update().set().where().returning(); returns the set spy
const mockTxUpdateReturning = (rows: unknown[]) => {
   const set = vi.fn((_fields?: unknown) => ({
      where: vi.fn(() => ({
         returning: vi.fn().mockResolvedValueOnce(rows),
      })),
   }));
   txUpdate.mockReturnValueOnce({ set });
   return { set };
};

// tx.insert().values() (no returning); returns the values spy
const mockTxInsertPlain = () => {
   const values = vi.fn((_values?: unknown) => Promise.resolve());
   txInsert.mockReturnValueOnce({ values });
   return { values };
};

// tx.insert().values().returning(); returns the values spy
const mockTxInsertReturning = (rows: unknown[]) => {
   const values = vi.fn((_values?: unknown) => ({
      returning: vi.fn().mockResolvedValueOnce(rows),
   }));
   txInsert.mockReturnValueOnce({ values });
   return { values };
};

// db.update().set().where() (reject path); returns the set spy
const mockUpdatePlain = () => {
   const set = vi.fn((_fields?: unknown) => ({
      where: vi.fn().mockResolvedValueOnce(undefined),
   }));
   mockUpdate.mockReturnValueOnce({ set });
   return { set };
};

// ── getByPage ───────────────────────

describe('transcriptions.getByPage', () => {
   it('returns the open transcription for the current user and page', async () => {
      mockLookup([mockTranscription]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.getByPage({
         pageId: 'page-1',
      });

      expect(result).toMatchObject({ id: 'transcription-1' });
   });

   it('returns null if there is no open transcription', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.getByPage({
         pageId: 'page-1',
      });

      expect(result).toBeNull();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.getByPage({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── create ───────────────────────

describe('transcriptions.create', () => {
   it('returns the existing open transcription without inserting', async () => {
      mockLookup([mockTranscription]); // findOpen

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'transcription-1' });
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('creates an empty transcription when nothing is approved', async () => {
      mockLookup([]); // findOpen
      mockLookup([]); // approved lookup
      const values = vi.fn((_values?: unknown) => ({
         returning: vi.fn().mockResolvedValueOnce([mockTranscription]),
      }));
      mockInsert.mockReturnValueOnce({ values });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'transcription-1' });
      expect(values).toHaveBeenCalledWith({
         pageId: 'page-1',
         userId: contributorUser.id,
         content: '',
         isBlank: false,
      });
   });

   it('prefills from the approved transcription (correction)', async () => {
      mockLookup([]); // findOpen
      mockLookup([{ content: 'Approved text', isBlank: false }]);
      const values = vi.fn((_values?: unknown) => ({
         returning: vi
            .fn()
            .mockResolvedValueOnce([
               { ...mockTranscription, content: 'Approved text' },
            ]),
      }));
      mockInsert.mockReturnValueOnce({ values });

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({ pageId: 'page-1' });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ content: 'Approved text', isBlank: false }),
      );
      expect(result).toMatchObject({ content: 'Approved text' });
   });

   it('prefills isBlank from an approved blank page', async () => {
      mockLookup([]);
      mockLookup([{ content: '', isBlank: true }]);
      const values = vi.fn((_values?: unknown) => ({
         returning: vi
            .fn()
            .mockResolvedValueOnce([{ ...mockTranscription, isBlank: true }]),
      }));
      mockInsert.mockReturnValueOnce({ values });

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.transcriptions.create({ pageId: 'page-1' });

      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ content: '', isBlank: true }),
      );
   });

   it('returns the winning row on a unique violation (double click)', async () => {
      mockLookup([]); // findOpen
      mockLookup([]); // approved
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockRejectedValueOnce({ code: '23505' }),
         })),
      });
      mockLookup([mockTranscription]); // findOpen again

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'transcription-1' });
   });

   it('detects a unique violation wrapped in err.cause', async () => {
      mockLookup([]);
      mockLookup([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi
               .fn()
               .mockRejectedValueOnce({ cause: { code: '23505' } }),
         })),
      });
      mockLookup([mockTranscription]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.create({ pageId: 'page-1' });

      expect(result).toMatchObject({ id: 'transcription-1' });
   });

   it('rethrows the error when the unique violation row cannot be found', async () => {
      mockLookup([]);
      mockLookup([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockRejectedValueOnce({ code: '23505' }),
         })),
      });
      mockLookup([]); // still nothing

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.create({ pageId: 'page-1' }),
      ).rejects.toBeDefined();
   });

   it('rethrows other insert errors', async () => {
      mockLookup([]);
      mockLookup([]);
      mockInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockRejectedValueOnce(new Error('db down')),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.create({ pageId: 'page-1' }),
      ).rejects.toThrow();
      // no retry lookup for non-23505 errors
      expect(mockSelect).toHaveBeenCalledTimes(2);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.create({ pageId: 'page-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── update ───────────────────────

describe('transcriptions.update', () => {
   it('updates a draft and snapshots a revision', async () => {
      const updated = { ...mockTranscription, content: 'Updated content' };
      mockLookup([mockTranscription]);
      const { set } = mockTxUpdateReturning([updated]);
      const { values } = mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'Updated content',
         isBlank: false,
      });

      expect(result).toMatchObject({ content: 'Updated content' });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({
            content: 'Updated content',
            isBlank: false,
         }),
      );
      expect(values).toHaveBeenCalledWith({
         transcriptionId: 'transcription-1',
         content: 'Updated content',
         isBlank: false,
      });
   });

   it('allows editing a rejected transcription', async () => {
      mockLookup([{ ...mockTranscription, status: 'rejected' }]);
      mockTxUpdateReturning([{ ...mockTranscription, content: 'Fixed' }]);
      mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'Fixed',
         isBlank: false,
      });

      expect(result).toMatchObject({ content: 'Fixed' });
   });

   it('stores empty content when the page is marked blank', async () => {
      mockLookup([mockTranscription]);
      const { set } = mockTxUpdateReturning([
         { ...mockTranscription, content: '', isBlank: true },
      ]);
      const { values } = mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'ignored text',
         isBlank: true,
      });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ content: '', isBlank: true }),
      );
      expect(values).toHaveBeenCalledWith(
         expect.objectContaining({ content: '', isBlank: true }),
      );
   });

   it('forks a new draft when the row is approved and no open row exists', async () => {
      mockLookup([{ ...mockTranscription, status: 'approved' }]);
      mockTxLookup([]); // no open row
      const created = {
         ...mockTranscription,
         id: 'new-draft',
         content: 'Correction',
      };
      const inserted = mockTxInsertReturning([created]);
      const revision = mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'Correction',
         isBlank: false,
      });

      expect(result).toMatchObject({ id: 'new-draft' });
      expect(inserted.values).toHaveBeenCalledWith({
         pageId: 'page-1',
         userId: contributorUser.id,
         content: 'Correction',
         isBlank: false,
      });
      expect(revision.values).toHaveBeenCalledWith({
         transcriptionId: 'new-draft',
         content: 'Correction',
         isBlank: false,
      });
      // the approved row itself is never updated
      expect(txUpdate).not.toHaveBeenCalled();
   });

   it('reuses the open draft when the row is approved', async () => {
      mockLookup([{ ...mockTranscription, status: 'approved' }]);
      mockTxLookup([{ id: 'open-1', status: 'draft' }]);
      mockTxUpdateReturning([
         { ...mockTranscription, id: 'open-1', content: 'Correction' },
      ]);
      const revision = mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.update({
         transcriptionId: 'transcription-1',
         content: 'Correction',
         isBlank: false,
      });

      expect(result).toMatchObject({ id: 'open-1' });
      expect(revision.values).toHaveBeenCalledWith(
         expect.objectContaining({ transcriptionId: 'open-1' }),
      );
      expect(txInsert).toHaveBeenCalledTimes(1);
   });

   it('throws BAD_REQUEST when the row is approved and the open row is submitted', async () => {
      mockLookup([{ ...mockTranscription, status: 'approved' }]);
      mockTxLookup([{ id: 'open-1', status: 'submitted' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(txInsert).not.toHaveBeenCalled();
      expect(txUpdate).not.toHaveBeenCalled();
   });

   it('throws CONFLICT when the guarded update matches no row', async () => {
      mockLookup([mockTranscription]);
      mockTxUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(txInsert).not.toHaveBeenCalled();
   });

   it('maps a unique violation while forking to CONFLICT', async () => {
      mockLookup([{ ...mockTranscription, status: 'approved' }]);
      mockTxLookup([]);
      txInsert.mockReturnValueOnce({
         values: vi.fn(() => ({
            returning: vi.fn().mockRejectedValueOnce({ code: '23505' }),
         })),
      });

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'nonexistent',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if transcription belongs to another user', async () => {
      mockLookup([{ ...mockTranscription, userId: 'other-user-id' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST if transcription is already submitted', async () => {
      mockLookup([{ ...mockTranscription, status: 'submitted' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.update({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── submit ───────────────────────

describe('transcriptions.submit', () => {
   it('submits a draft and snapshots a revision when content changed', async () => {
      mockLookup([mockTranscription]);
      const { set } = mockTxUpdateReturning([
         { ...mockTranscription, status: 'submitted' },
      ]);
      const { values } = mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.submit({
         transcriptionId: 'transcription-1',
         content: 'Updated content',
         isBlank: false,
      });

      expect(result).toMatchObject({ status: 'submitted' });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({
            content: 'Updated content',
            status: 'submitted',
            rejectionReason: null,
         }),
      );
      expect(values).toHaveBeenCalledWith({
         transcriptionId: 'transcription-1',
         content: 'Updated content',
         isBlank: false,
      });
   });

   it('skips the revision when nothing changed since the last save', async () => {
      mockLookup([mockTranscription]);
      mockTxUpdateReturning([{ ...mockTranscription, status: 'submitted' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await caller.transcriptions.submit({
         transcriptionId: 'transcription-1',
         content: mockTranscription.content,
         isBlank: false,
      });

      expect(txInsert).not.toHaveBeenCalled();
   });

   it('resubmits a rejected transcription and clears the rejection reason', async () => {
      mockLookup([
         {
            ...mockTranscription,
            status: 'rejected',
            rejectionReason: 'Too vague',
         },
      ]);
      const { set } = mockTxUpdateReturning([
         { ...mockTranscription, status: 'submitted' },
      ]);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.submit({
         transcriptionId: 'transcription-1',
         content: mockTranscription.content,
         isBlank: false,
      });

      expect(result).toMatchObject({ status: 'submitted' });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ rejectionReason: null }),
      );
   });

   it('submits a blank page with empty content', async () => {
      mockLookup([mockTranscription]);
      const { set } = mockTxUpdateReturning([
         {
            ...mockTranscription,
            content: '',
            isBlank: true,
            status: 'submitted',
         },
      ]);
      mockTxInsertPlain();

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.transcriptions.submit({
         transcriptionId: 'transcription-1',
         content: 'ignored',
         isBlank: true,
      });

      expect(result).toMatchObject({ isBlank: true, status: 'submitted' });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ content: '', isBlank: true }),
      );
   });

   it('throws CONFLICT when the guarded update matches no row', async () => {
      mockLookup([mockTranscription]);
      mockTxUpdateReturning([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(txInsert).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if transcription belongs to another user', async () => {
      mockLookup([{ ...mockTranscription, userId: 'other-user-id' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({
            transcriptionId: 'transcription-1',
            content: 'Updated content',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it.each(['submitted', 'approved'] as const)(
      'throws BAD_REQUEST if status is %s',
      async (status) => {
         mockLookup([{ ...mockTranscription, status }]);

         const caller = createAuthenticatedCaller(contributorUser);
         await expect(
            caller.transcriptions.submit({
               transcriptionId: 'transcription-1',
               content: 'Updated content',
               isBlank: false,
            }),
         ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
         expect(mockTransaction).not.toHaveBeenCalled();
      },
   );

   it('throws BAD_REQUEST if content is empty and isBlank is false', async () => {
      mockLookup([mockTranscription]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({
            transcriptionId: 'transcription-1',
            content: '   ',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockLookup([]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.submit({
            transcriptionId: 'nonexistent',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.submit({
            transcriptionId: 'transcription-1',
            content: 'x',
            isBlank: false,
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getRevisions ───────────────────────

describe('transcriptions.getRevisions', () => {
   it('returns revisions for an owned transcription', async () => {
      const revisions = [
         {
            id: 'rev-1',
            transcriptionId: 'transcription-1',
            content: 'v1',
            savedAt: new Date().toISOString(),
         },
      ];

      mockLookup([mockTranscription]);
      mockSelect.mockReturnValueOnce({
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
      mockLookup([{ ...mockTranscription, userId: 'other-user-id' }]);

      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.getRevisions({
            transcriptionId: 'transcription-1',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockLookup([]);

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
   const mockQueue = (rows: unknown[]) => {
      const orderBy = vi.fn().mockResolvedValueOnce(rows);
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               innerJoin: vi.fn(() => ({
                  innerJoin: vi.fn(() => ({
                     where: vi.fn(() => ({ orderBy })),
                  })),
               })),
            })),
         })),
      });
      return { orderBy };
   };

   const queue = [
      {
         id: 'transcription-1',
         pageId: 'page-1',
         userId: contributorUser.id,
         pageNumber: 1,
         documentId: 'doc-1',
         documentTitle: 'Test Doc',
         contributorUsername: 'testUser',
         status: 'submitted',
         updatedAt: new Date().toISOString(),
      },
   ];

   it('returns submitted transcriptions for editors', async () => {
      mockQueue(queue);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.listQueue({
         sort: 'oldest',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ status: 'submitted' });
   });

   it('works for admins', async () => {
      mockQueue(queue);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.transcriptions.listQueue({
         sort: 'newest',
      });

      expect(result).toHaveLength(1);
   });

   it('orders by two keys for both sorts', async () => {
      const oldest = mockQueue(queue);
      const newest = mockQueue(queue);

      const caller = createAuthenticatedCaller(editorUser);
      await caller.transcriptions.listQueue({ sort: 'oldest' });
      await caller.transcriptions.listQueue({ sort: 'newest' });

      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).not.toStrictEqual(
         newest.orderBy.mock.calls[0],
      );
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.listQueue({ sort: 'oldest' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.listQueue({ sort: 'oldest' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── approve ───────────────────────

describe('transcriptions.approve', () => {
   const approvedRow = {
      ...mockTranscription,
      status: 'approved',
      content: 'Final text',
      isBlank: false,
   };

   it('approves, snapshots a version and sends the approval email', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);
      const del = vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(undefined),
      }));
      txDelete.mockImplementationOnce(del);
      const { set } = mockTxUpdateReturning([approvedRow]);
      const { values } = mockTxInsertPlain();
      mockSendApprovalEmail.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.approve({
         transcriptionId: 'transcription-1',
      });

      expect(result).toEqual({ success: true });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // the previous approved row is removed first
      expect(del).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ status: 'approved' }),
      );
      expect(values).toHaveBeenCalledWith({
         pageId: 'page-1',
         transcriptionId: approvedRow.id,
         userId: approvedRow.userId,
         approvedBy: editorUser.id,
         content: 'Final text',
         isBlank: false,
      });
      expect(mockSendApprovalEmail).toHaveBeenCalledWith({
         to: contributorUser.email,
         username: contributorUser.username,
         documentId: 'doc-1',
      });
   });

   it('lets an admin approve', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);
      txDelete.mockReturnValueOnce({
         where: vi.fn().mockResolvedValueOnce(undefined),
      });
      mockTxUpdateReturning([approvedRow]);
      mockTxInsertPlain();

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).resolves.toEqual({ success: true });
   });

   it('throws CONFLICT and sends no email when already reviewed', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);
      txDelete.mockReturnValueOnce({
         where: vi.fn().mockResolvedValueOnce(undefined),
      });
      mockTxUpdateReturning([]);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(txInsert).not.toHaveBeenCalled();
      expect(mockSendApprovalEmail).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if the transcription author was deleted', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         userId: null,
         user: null,
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockSendApprovalEmail).not.toHaveBeenCalled();
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
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it.each(['draft', 'rejected', 'approved'] as const)(
      'throws BAD_REQUEST if transcription status is %s',
      async (status) => {
         mockFindFirst.mockResolvedValueOnce({
            ...mockTranscriptionWithUser,
            status,
         });

         const caller = createAuthenticatedCaller(editorUser);
         await expect(
            caller.transcriptions.approve({
               transcriptionId: 'transcription-1',
            }),
         ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
         expect(mockTransaction).not.toHaveBeenCalled();
      },
   );

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.approve({ transcriptionId: 'transcription-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockFindFirst).not.toHaveBeenCalled();
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
   it('rejects a submitted transcription and sends the rejection email', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);
      const { set } = mockUpdatePlain();
      mockSendRejectionEmail.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.reject({
         transcriptionId: 'transcription-1',
         reason: 'Needs more detail',
      });

      expect(result).toEqual({ success: true });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({
            status: 'rejected',
            rejectionReason: 'Needs more detail',
         }),
      );
      expect(mockSendRejectionEmail).toHaveBeenCalledWith({
         to: contributorUser.email,
         username: contributorUser.username,
         documentId: 'doc-1',
         reason: 'Needs more detail',
      });
   });

   it('lets an admin reject', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);
      mockUpdatePlain();
      mockSendRejectionEmail.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'Needs more detail',
         }),
      ).resolves.toEqual({ success: true });
   });

   it('throws NOT_FOUND if transcription does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'nonexistent',
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws NOT_FOUND if the transcription author was deleted', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         userId: null,
         user: null,
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendRejectionEmail).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if editor tries to reject their own transcription', async () => {
      mockFindFirst.mockResolvedValueOnce({
         ...mockTranscriptionWithUser,
         userId: editorUser.id,
      });

      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockUpdate).not.toHaveBeenCalled();
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
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockFindFirst).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.reject({
            transcriptionId: 'transcription-1',
            reason: 'Needs more detail',
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getSubmittedByPageAndUser ───────────────────────

describe('transcriptions.getSubmittedByPageAndUser', () => {
   it('returns the submitted transcription for editors', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.getSubmittedByPageAndUser({
         pageId: 'page-1',
         userId: contributorUser.id,
      });

      expect(result).toMatchObject({ status: 'submitted' });
   });

   it('returns null if no submitted transcription exists', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(editorUser);
      const result = await caller.transcriptions.getSubmittedByPageAndUser({
         pageId: 'page-1',
         userId: contributorUser.id,
      });

      expect(result).toBeNull();
   });

   it('works for admins', async () => {
      mockFindFirst.mockResolvedValueOnce(mockTranscriptionWithUser);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.transcriptions.getSubmittedByPageAndUser({
         pageId: 'page-1',
         userId: contributorUser.id,
      });

      expect(result).toMatchObject({ status: 'submitted' });
   });

   it('throws FORBIDDEN if user is a contributor', async () => {
      const caller = createAuthenticatedCaller(contributorUser);
      await expect(
         caller.transcriptions.getSubmittedByPageAndUser({
            pageId: 'page-1',
            userId: contributorUser.id,
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockFindFirst).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.transcriptions.getSubmittedByPageAndUser({
            pageId: 'page-1',
            userId: contributorUser.id,
         }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── getApprovedByPage ───────────────────────

describe('transcriptions.getApprovedByPage', () => {
   // select().from().innerJoin().where().limit()
   const mockApproved = (rows: unknown[]) =>
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValueOnce(rows),
               })),
            })),
         })),
      });

   it('returns the approved transcription with the author', async () => {
      mockApproved([
         {
            ...mockTranscription,
            status: 'approved',
            username: 'testUser',
            userAvatar: null,
         },
      ]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.transcriptions.getApprovedByPage({
         pageId: 'page-1',
      });

      expect(result).toMatchObject({
         status: 'approved',
         username: 'testUser',
      });
   });

   it('returns null if no approved transcription exists', async () => {
      mockApproved([]);

      const caller = createUnauthenticatedCaller();
      const result = await caller.transcriptions.getApprovedByPage({
         pageId: 'page-1',
      });

      expect(result).toBeNull();
   });

   it.todo(
      'returns the approved row when the author was deleted (needs leftJoin in the router)',
   );
});
