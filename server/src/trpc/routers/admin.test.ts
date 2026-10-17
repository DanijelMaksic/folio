import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const {
   mockSelect,
   mockUpdate,
   mockTransaction,
   mockApprovedEmail,
   mockRejectedEmail,
} = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockTransaction: vi.fn(),
   mockApprovedEmail: vi.fn(),
   mockRejectedEmail: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      update: mockUpdate,
      transaction: mockTransaction,
   },
}));

vi.mock('@/lib/email.js', () => ({
   sendRoleRequestApprovedEmail: mockApprovedEmail,
   sendRoleRequestRejectedEmail: mockRejectedEmail,
}));

beforeEach(() => {
   vi.resetAllMocks();
   mockApprovedEmail.mockResolvedValue(undefined);
   mockRejectedEmail.mockResolvedValue(undefined);
});

const adminUser = mockUser({ globalRole: 'admin' });
const regularUser = mockUser({ globalRole: 'contributor' });

// --- helpers ---------------------------------------------------------------

// setUserRole transaction: update().set().where().returning(), then delete().where()
const mockRoleTx = (rows: unknown[]) => {
   const set = vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })),
   }));
   const txDelete = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
   }));
   mockTransaction.mockImplementationOnce(async (cb) =>
      cb({ update: vi.fn(() => ({ set })), delete: txDelete }),
   );
   return { set, txDelete };
};

// approveRoleRequest transaction: two update().set().where(), then delete().where()
const mockApproveTx = () => {
   const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
   const txDelete = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
   }));
   mockTransaction.mockImplementationOnce(async (cb) =>
      cb({ update: vi.fn(() => ({ set })), delete: txDelete }),
   );
   return { set, txDelete };
};

// select().from().innerJoin().where().limit()
const mockRequestLookup = (rows: unknown[]) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
               limit: vi.fn().mockResolvedValueOnce(rows),
            })),
         })),
      })),
   });

const pendingRequest = (requestedRole: 'contributor' | 'editor') => ({
   id: 'req-1',
   userId: 'target-user-id',
   requestedRole,
   status: 'pending',
   email: 'target@example.com',
});

// --- setUserRole -----------------------------------------------------------

describe('admin.setUserRole', () => {
   it('allows admin to set a viewer role', async () => {
      mockRoleTx([{ id: 'target-user-id' }]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'viewer',
      });

      expect(result).toEqual({ success: true });
   });

   it.each([
      ['editor', true],
      ['admin', true],
      ['contributor', false],
      ['viewer', false],
   ] as const)(
      'sets twoFactorEnabled correctly when assigning %s',
      async (role, expected) => {
         const { set } = mockRoleTx([{ id: 'target-user-id' }]);

         const caller = createAuthenticatedCaller(adminUser);
         await caller.admin.setUserRole({ userId: 'target-user-id', role });

         expect(set).toHaveBeenCalledWith(
            expect.objectContaining({
               globalRole: role,
               twoFactorEnabled: expected,
            }),
         );
      },
   );

   it('deletes the target user sessions on a role change', async () => {
      const { txDelete } = mockRoleTx([{ id: 'target-user-id' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'viewer', // demotion also invalidates sessions
      });

      expect(txDelete).toHaveBeenCalledTimes(1);
   });

   it('throws NOT_FOUND for an unknown user and deletes no sessions', async () => {
      const { txDelete } = mockRoleTx([]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: 'ghost', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(txDelete).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST when an admin changes their own role', async () => {
      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: adminUser.id, role: 'viewer' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });

   it('throws UNAUTHORIZED if user is not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// --- listRoleRequests ------------------------------------------------------

describe('admin.listRoleRequests', () => {
   it('returns pending requests with ISO date strings', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({
                  orderBy: vi.fn().mockResolvedValueOnce([
                     {
                        id: 'req-1',
                        userId: 'u1',
                        requestedRole: 'editor',
                        message: 'Please',
                        status: 'pending',
                        rejectionReason: null,
                        createdAt: new Date('2026-01-01T00:00:00Z'),
                        reviewedAt: null,
                        username: 'alice',
                        name: 'Alice',
                        email: 'alice@example.com',
                        currentRole: 'contributor',
                     },
                  ]),
               })),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listRoleRequests();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
         createdAt: '2026-01-01T00:00:00.000Z',
         reviewedAt: null,
      });
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(caller.admin.listRoleRequests()).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
   });
});

// --- approveRoleRequest ----------------------------------------------------

describe('admin.approveRoleRequest', () => {
   it('approves an editor request: role, 2FA, session deletion, email', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      const { set, txDelete } = mockApproveTx();

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.approveRoleRequest({ id: 'req-1' });

      expect(result).toEqual({ success: true });
      expect(set).toHaveBeenCalledWith({
         globalRole: 'editor',
         twoFactorEnabled: true,
      });
      expect(txDelete).toHaveBeenCalledTimes(1);
      expect(mockApprovedEmail).toHaveBeenCalledWith(
         'target@example.com',
         'editor',
      );
   });

   it('does not touch twoFactorEnabled for a contributor request', async () => {
      mockRequestLookup([pendingRequest('contributor')]);
      const { set } = mockApproveTx();

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.approveRoleRequest({ id: 'req-1' });

      expect(set).toHaveBeenCalledWith({ globalRole: 'contributor' });
   });

   it('still succeeds when the approval email fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequestLookup([pendingRequest('editor')]);
      mockApproveTx();
      mockApprovedEmail.mockRejectedValueOnce(new Error('mailjet down'));

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).resolves.toEqual({ success: true });
   });

   it('throws NOT_FOUND for an unknown request', async () => {
      mockRequestLookup([]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'nope' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws CONFLICT if the request was already reviewed', async () => {
      mockRequestLookup([{ ...pendingRequest('editor'), status: 'approved' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });
});

// --- rejectRoleRequest -----------------------------------------------------

describe('admin.rejectRoleRequest', () => {
   const mockRejectUpdate = () => {
      const set = vi.fn(() => ({
         where: vi.fn().mockResolvedValue(undefined),
      }));
      mockUpdate.mockReturnValueOnce({ set });
      return set;
   };

   it('rejects with a reason and emails the user', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      const set = mockRejectUpdate();

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.rejectRoleRequest({
         id: 'req-1',
         reason: 'Not enough activity',
      });

      expect(result).toEqual({ success: true });
      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({
            status: 'rejected',
            rejectionReason: 'Not enough activity',
            reviewedBy: adminUser.id,
         }),
      );
      expect(mockRejectedEmail).toHaveBeenCalledWith(
         'target@example.com',
         'Not enough activity',
      );
   });

   it('stores null when no reason is given', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      const set = mockRejectUpdate();

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.rejectRoleRequest({ id: 'req-1' });

      expect(set).toHaveBeenCalledWith(
         expect.objectContaining({ rejectionReason: null }),
      );
   });

   it('still succeeds when the rejection email fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequestLookup([pendingRequest('editor')]);
      mockRejectUpdate();
      mockRejectedEmail.mockRejectedValueOnce(new Error('mailjet down'));

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.rejectRoleRequest({ id: 'req-1' }),
      ).resolves.toEqual({ success: true });
   });

   it('throws NOT_FOUND for an unknown request', async () => {
      mockRequestLookup([]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.rejectRoleRequest({ id: 'nope' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws CONFLICT if the request was already reviewed', async () => {
      mockRequestLookup([{ ...pendingRequest('editor'), status: 'rejected' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.rejectRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockUpdate).not.toHaveBeenCalled();
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(
         caller.admin.rejectRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });
});
