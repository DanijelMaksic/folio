import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const { mockUpdate } = vi.hoisted(() => ({
   mockUpdate: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      update: mockUpdate,
   },
}));

vi.mock('@/lib/email.js', () => ({
   sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
   vi.clearAllMocks();

   mockUpdate.mockReturnValue({
      set: vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(undefined),
      })),
   });
});

const adminUser = mockUser({ globalRole: 'admin' });
const regularUser = mockUser({ globalRole: 'contributor' });

describe('admin.setUserRole', () => {
   it('allows admin to set a viewer role', async () => {
      const caller = createAuthenticatedCaller(adminUser);
      const result = await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'viewer',
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalled();
   });

   it('sets twoFactorEnabled to true when assigning editor role', async () => {
      const mockSet = vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(undefined),
      }));
      mockUpdate.mockReturnValueOnce({ set: mockSet });

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'editor',
      });

      expect(mockSet).toHaveBeenCalledWith(
         expect.objectContaining({
            globalRole: 'editor',
            twoFactorEnabled: true,
         }),
      );
   });

   it('sets twoFactorEnabled to true when assigning admin role', async () => {
      const mockSet = vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(undefined),
      }));
      mockUpdate.mockReturnValueOnce({ set: mockSet });

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'admin',
      });

      expect(mockSet).toHaveBeenCalledWith(
         expect.objectContaining({
            globalRole: 'admin',
            twoFactorEnabled: true,
         }),
      );
   });

   it('sets twoFactorEnabled to false when assigning contributor role', async () => {
      const mockSet = vi.fn(() => ({
         where: vi.fn().mockResolvedValueOnce(undefined),
      }));
      mockUpdate.mockReturnValueOnce({ set: mockSet });

      const caller = createAuthenticatedCaller(adminUser);
      await caller.admin.setUserRole({
         userId: 'target-user-id',
         role: 'contributor',
      });

      expect(mockSet).toHaveBeenCalledWith(
         expect.objectContaining({
            globalRole: 'contributor',
            twoFactorEnabled: false,
         }),
      );
   });

   it('throws FORBIDDEN if caller is not admin', async () => {
      const caller = createAuthenticatedCaller(regularUser);
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
   });

   it('throws UNAUTHORIZED if user is not signed in', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.admin.setUserRole({ userId: 'target-user-id', role: 'editor' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
