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
   mockSyncTwoFactorRow,
} = vi.hoisted(() => ({
   mockSelect: vi.fn(),
   mockUpdate: vi.fn(),
   mockTransaction: vi.fn(),
   mockApprovedEmail: vi.fn(),
   mockRejectedEmail: vi.fn(),
   mockSyncTwoFactorRow: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
      update: mockUpdate,
      transaction: mockTransaction,
   },
}));

vi.mock('@/lib/two-factor.js', () => ({
   syncTwoFactorRow: mockSyncTwoFactorRow,
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

const adminUser = mockUser({ id: 'admin-id', globalRole: 'admin' });
const editorUser = mockUser({ id: 'editor-id', globalRole: 'editor' });
const regularUser = mockUser({ id: 'regular-id', globalRole: 'contributor' });

// ── helpers ───────────────────────

// Transaction shared by setUserRole and approveRoleRequest:
//   tx.select().from().where().limit().for('update')  -> rows
//   tx.update().set().where()   (every update shares one `set` spy)
//   tx.delete().where()
//   tx.insert().values()
const mockTx = (targetRows: unknown[]) => {
   const forUpdate = vi.fn().mockResolvedValue(targetRows);
   const txSelect = vi.fn(() => ({
      from: vi.fn(() => ({
         where: vi.fn(() => ({
            limit: vi.fn(() => ({ for: forUpdate })),
         })),
      })),
   }));
   const set = vi.fn((_fields?: unknown) => ({
      where: vi.fn().mockResolvedValue(undefined),
   }));
   const txUpdate = vi.fn(() => ({ set }));
   const txDelete = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
   }));
   const values = vi.fn((_values?: unknown) => Promise.resolve());
   const txInsert = vi.fn(() => ({ values }));

   mockTransaction.mockImplementationOnce(async (cb) =>
      cb({
         select: txSelect,
         update: txUpdate,
         delete: txDelete,
         insert: txInsert,
      }),
   );

   return { forUpdate, set, txUpdate, txDelete, txInsert, values };
};

// select().from().innerJoin().where().limit() -> rows (request lookup)
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

const pendingRequest = (requestedRole: 'contributor' | 'editor' | 'admin') => ({
   id: 'req-1',
   userId: 'target-user-id',
   requestedRole,
   status: 'pending',
   email: 'target@example.com',
});

// ── setUserRole ───────────────────────

describe('admin.setUserRole', () => {
   it('promotes a contributor to editor', async () => {
      mockTx([{ role: 'contributor', username: 'target' }]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'editor',
      });

      expect(result).toEqual({ success: true });
   });

   it('promotes an editor to admin', async () => {
      const { set } = mockTx([{ role: 'editor', username: 'target' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'admin' }),
      ).resolves.toEqual({ success: true });

      expect(set).toHaveBeenCalledWith({
         globalRole: 'admin',
         twoFactorEnabled: true,
      });
   });

   it('rejects promoting a contributor straight to admin', async () => {
      const { txUpdate, txDelete, txInsert } = mockTx([
         { role: 'contributor', username: 'target' },
      ]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'admin' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(txUpdate).not.toHaveBeenCalled();
      expect(txDelete).not.toHaveBeenCalled();
      expect(txInsert).not.toHaveBeenCalled();
   });

   it('rejects when the user already has the role', async () => {
      const { txUpdate, txInsert } = mockTx([
         { role: 'editor', username: 'target' },
      ]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(txUpdate).not.toHaveBeenCalled();
      expect(txInsert).not.toHaveBeenCalled();
   });

   it.each([
      ['contributor', 'editor', 'editor', true],
      ['editor', 'admin', 'admin', true],
      ['editor', 'contributor', 'contributor', false],
      ['admin', 'editor', 'editor', true],
      ['admin', 'contributor', 'contributor', false],
   ] as const)(
      'sets twoFactorEnabled correctly for %s -> %s',
      async (oldRole, _label, role, expected) => {
         const { set } = mockTx([{ role: oldRole, username: 'target' }]);

         const caller = createAuthenticatedCaller(adminUser);
         await caller.admin.setUserRole({ userId: 'target-user-id', role });

         expect(set).toHaveBeenCalledWith({
            globalRole: role,
            twoFactorEnabled: expected,
         });
         expect(mockSyncTwoFactorRow).toHaveBeenCalledWith(
            expect.anything(),
            'target-user-id',
            expected,
         );
      },
   );

   it('locks the target row inside the transaction', async () => {
      const { forUpdate } = mockTx([
         { role: 'contributor', username: 'target' },
      ]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'editor',
      });

      expect(forUpdate).toHaveBeenCalledWith('update');
   });

   it('deletes the target user sessions on a role change', async () => {
      const { txDelete } = mockTx([{ role: 'editor', username: 'target' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'contributor',
      });

      expect(txDelete).toHaveBeenCalledTimes(1);
   });

   it('writes an audit row with the old and new role', async () => {
      const { values } = mockTx([{ role: 'editor', username: 'target' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'contributor',
      });

      expect(values).toHaveBeenCalledWith({
         actorId: adminUser.id,
         targetId: 'target-user-id',
         actorUsername: adminUser.username,
         targetUsername: 'target',
         oldRole: 'editor',
         newRole: 'contributor',
         source: 'direct',
      });
   });

   it('throws NOT_FOUND for an unknown user and changes nothing', async () => {
      const { txUpdate, txDelete, txInsert } = mockTx([]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: 'ghost', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(txUpdate).not.toHaveBeenCalled();
      expect(txDelete).not.toHaveBeenCalled();
      expect(txInsert).not.toHaveBeenCalled();
      expect(mockSyncTwoFactorRow).not.toHaveBeenCalled();
   });

   it('throws BAD_REQUEST when an admin changes their own role', async () => {
      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.setUserRole({ userId: adminUser.id, role: 'editor' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it.each([
      ['editor', editorUser],
      ['contributor', regularUser],
   ] as const)('throws FORBIDDEN if caller is a %s', async (_name, user) => {
      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockTransaction).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if user is not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });

   it.todo('rejects demoting the last remaining admin (guard not in router)');
});

// ── listEditors ───────────────────────

describe('admin.listEditors', () => {
   it('returns the editors', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }]),
         })),
      });

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listEditors();

      expect(result).toHaveLength(2);
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(caller.admin.listEditors()).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
   });
});

// ── listStaff ───────────────────────

describe('admin.listStaff', () => {
   const mockStaff = (rows: unknown[]) => {
      const where = vi.fn((_where?: unknown) => Promise.resolve(rows));
      mockSelect.mockReturnValueOnce({ from: vi.fn(() => ({ where })) });
      return { where };
   };

   const staffRows = [
      {
         id: 'e1',
         username: 'ed',
         name: 'Ed',
         image: null,
         globalRole: 'editor',
      },
      {
         id: 'a1',
         username: 'ad',
         name: 'Ad',
         image: null,
         globalRole: 'admin',
      },
   ];

   it.each(['all', 'editor', 'admin'] as const)(
      'returns staff for role %s',
      async (role) => {
         const { where } = mockStaff(staffRows);

         const caller = createAuthenticatedCaller(adminUser);
         const result = await caller.admin.listStaff({ role });

         expect(result).toHaveLength(2);
         expect(where.mock.calls[0][0]).toBeDefined();
      },
   );

   it('does not return email', async () => {
      mockStaff(staffRows);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listStaff({ role: 'all' });

      expect(result[0]).not.toHaveProperty('email');
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.admin.listStaff({ role: 'all' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).not.toHaveBeenCalled();
   });
});

// ── listRoleRequests ───────────────────────

describe('admin.listRoleRequests', () => {
   const mockRequests = (rows: unknown[]) => {
      const orderBy = vi.fn().mockResolvedValueOnce(rows);
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(() => ({ orderBy })),
            })),
         })),
      });
      return { orderBy };
   };

   const row = {
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
      userAvatar: null,
      currentRole: 'contributor',
   };

   it('returns pending requests with ISO date strings', async () => {
      mockRequests([row]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listRoleRequests({ sort: 'oldest' });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
         createdAt: '2026-01-01T00:00:00.000Z',
         reviewedAt: null,
      });
   });

   it('converts reviewedAt to an ISO string when present', async () => {
      mockRequests([{ ...row, reviewedAt: new Date('2026-02-01T00:00:00Z') }]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listRoleRequests({ sort: 'newest' });

      expect(result[0]).toMatchObject({
         reviewedAt: '2026-02-01T00:00:00.000Z',
      });
   });

   it('orders by sort plus id as a tiebreaker', async () => {
      const newest = mockRequests([]);
      const oldest = mockRequests([]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.listRoleRequests({ sort: 'newest' });
      await caller.admin.listRoleRequests({ sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(
         caller.admin.listRoleRequests({ sort: 'oldest' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.listRoleRequests({ sort: 'oldest' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── approveRoleRequest ───────────────────────

describe('admin.approveRoleRequest', () => {
   it('approves an editor request: role, 2FA, sessions, audit, email', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      const { set, txDelete, values } = mockTx([
         { role: 'contributor', username: 'target' },
      ]);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.approveRoleRequest({ id: 'req-1' });

      expect(result).toEqual({ success: true });
      // first update: the user row
      expect(set.mock.calls[0][0]).toEqual({
         globalRole: 'editor',
         twoFactorEnabled: true,
      });
      // second update: the request row
      expect(set.mock.calls[1][0]).toEqual(
         expect.objectContaining({
            status: 'approved',
            reviewedBy: adminUser.id,
         }),
      );
      expect(txDelete).toHaveBeenCalledTimes(1);
      expect(mockSyncTwoFactorRow).toHaveBeenCalledWith(
         expect.anything(),
         'target-user-id',
         true,
      );
      expect(values).toHaveBeenCalledWith({
         actorId: adminUser.id,
         targetId: 'target-user-id',
         actorUsername: adminUser.username,
         targetUsername: 'target',
         oldRole: 'contributor',
         newRole: 'editor',
         source: 'request',
      });
      expect(mockApprovedEmail).toHaveBeenCalledWith(
         'target@example.com',
         'editor',
      );
   });

   it('disables twoFactorEnabled for a contributor request', async () => {
      mockRequestLookup([pendingRequest('contributor')]);
      const { set } = mockTx([{ role: 'editor', username: 'target' }]);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.approveRoleRequest({ id: 'req-1' });

      expect(set.mock.calls[0][0]).toEqual({
         globalRole: 'contributor',
         twoFactorEnabled: false,
      });
      expect(mockSyncTwoFactorRow).toHaveBeenCalledWith(
         expect.anything(),
         'target-user-id',
         false,
      );
   });

   it('rejects an admin role request', async () => {
      mockRequestLookup([pendingRequest('admin')]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockApprovedEmail).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND when the user disappears inside the transaction', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      const { txUpdate, txInsert } = mockTx([]);

      const caller = createAuthenticatedCaller(adminUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(txUpdate).not.toHaveBeenCalled();
      expect(txInsert).not.toHaveBeenCalled();
      expect(mockApprovedEmail).not.toHaveBeenCalled();
   });

   it('still succeeds when the approval email fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRequestLookup([pendingRequest('editor')]);
      mockTx([{ role: 'contributor', username: 'target' }]);
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
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.approveRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── rejectRoleRequest ───────────────────────

describe('admin.rejectRoleRequest', () => {
   const mockRejectUpdate = () => {
      const set = vi.fn((_fields?: unknown) => ({
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

   it('does not change the role or touch transactions', async () => {
      mockRequestLookup([pendingRequest('editor')]);
      mockRejectUpdate();

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.rejectRoleRequest({ id: 'req-1' });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockSyncTwoFactorRow).not.toHaveBeenCalled();
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
      const caller = createAuthenticatedCaller(editorUser);
      await expect(
         caller.admin.rejectRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.rejectRoleRequest({ id: 'req-1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});

// ── listRoleChanges ───────────────────────

describe('admin.listRoleChanges', () => {
   // results: select().from().where().limit().offset().orderBy(order, id)
   // count:   select().from() is awaited directly today; if you add
   //          .where(where) to the router it is called on the same object.
   const mockChanges = (rows: unknown[], total: number) => {
      const orderBy = vi.fn().mockResolvedValueOnce(rows);
      const resultsWhere = vi.fn((_where?: unknown) => ({
         limit: vi.fn(() => ({
            offset: vi.fn(() => ({ orderBy })),
         })),
      }));
      const countWhere = vi.fn((_where?: unknown) =>
         Promise.resolve([{ total }]),
      );

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({ where: resultsWhere })),
      });
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() =>
            Object.assign(Promise.resolve([{ total }]), {
               where: countWhere,
            }),
         ),
      });

      return { orderBy, resultsWhere, countWhere };
   };

   const change = {
      id: 'rc-1',
      actorId: adminUser.id,
      targetId: 'target-user-id',
      actorUsername: 'admin',
      targetUsername: 'target',
      oldRole: 'contributor',
      newRole: 'editor',
      source: 'direct',
      createdAt: new Date('2026-01-01T00:00:00Z'),
   };

   const base = { page: 1, limit: 20, sort: 'newest', type: 'all' } as const;

   it('returns role changes and totalPages', async () => {
      mockChanges([change], 45);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listRoleChanges(base);

      expect(result.roleChanges).toHaveLength(1);
      expect(result.roleChanges[0]).toMatchObject({ id: 'rc-1' });
      expect(result.totalPages).toBe(3);
   });

   it('returns zero pages when there are no changes', async () => {
      mockChanges([], 0);

      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.listRoleChanges(base);

      expect(result.roleChanges).toHaveLength(0);
      expect(result.totalPages).toBe(0);
   });

   it('applies no where for type all', async () => {
      const { resultsWhere } = mockChanges([], 0);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.listRoleChanges(base);

      expect(resultsWhere.mock.calls[0][0]).toBeUndefined();
   });

   it.each(['promotion', 'demotion'] as const)(
      'applies a where for type %s',
      async (type) => {
         const { resultsWhere } = mockChanges([], 0);

         const caller = createAuthenticatedCaller(adminUser);
         await caller.admin.listRoleChanges({ ...base, type });

         expect(resultsWhere.mock.calls[0][0]).toBeDefined();
      },
   );

   it('orders by sort plus id as a tiebreaker', async () => {
      const newest = mockChanges([], 0);
      const oldest = mockChanges([], 0);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.listRoleChanges({ ...base, sort: 'newest' });
      await caller.admin.listRoleChanges({ ...base, sort: 'oldest' });

      expect(newest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(oldest.orderBy.mock.calls[0]).toHaveLength(2);
      expect(newest.orderBy.mock.calls[0][0]).not.toStrictEqual(
         oldest.orderBy.mock.calls[0][0],
      );
   });

   it('uses the same where for the count query', async () => {
      const { resultsWhere, countWhere } = mockChanges([], 0);

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.listRoleChanges({ ...base, type: 'promotion' });

      expect(countWhere).toHaveBeenCalledTimes(1);
      expect(countWhere.mock.calls[0][0]).toBe(resultsWhere.mock.calls[0][0]);
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(editorUser);
      await expect(caller.admin.listRoleChanges(base)).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(caller.admin.listRoleChanges(base)).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});
