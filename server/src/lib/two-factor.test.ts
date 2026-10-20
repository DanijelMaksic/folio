import { describe, it, expect, vi } from 'vitest';
import { twoFactor } from '@/db/schema/auth.js';
import { syncTwoFactorRow } from '@/lib/two-factor.js';

type Tx = Parameters<typeof syncTwoFactorRow>[0];

// Builds a fake tx matching the chains the helper uses:
//   select().from().where().limit()
//   insert().values()
//   delete().where()
const makeTx = (existingRows: unknown[] = []) => {
   const limit = vi.fn().mockResolvedValue(existingRows);
   const selectWhere = vi.fn(() => ({ limit }));
   const from = vi.fn(() => ({ where: selectWhere }));
   const select = vi.fn(() => ({ from }));

   const values = vi.fn().mockResolvedValue(undefined);
   const insert = vi.fn(() => ({ values }));

   const deleteWhere = vi.fn().mockResolvedValue(undefined);
   const del = vi.fn(() => ({ where: deleteWhere }));

   const tx = { select, insert, delete: del } as unknown as Tx;

   return { tx, select, from, insert, values, del, deleteWhere };
};

describe('syncTwoFactorRow', () => {
   describe('when enabled is false', () => {
      it('deletes the user two-factor row', async () => {
         const { tx, del, deleteWhere } = makeTx();

         await syncTwoFactorRow(tx, 'user-1', false);

         expect(del).toHaveBeenCalledWith(twoFactor);
         expect(deleteWhere).toHaveBeenCalledTimes(1);
      });

      it('does not look up or insert anything', async () => {
         const { tx, select, insert } = makeTx();

         await syncTwoFactorRow(tx, 'user-1', false);

         expect(select).not.toHaveBeenCalled();
         expect(insert).not.toHaveBeenCalled();
      });
   });

   describe('when enabled is true', () => {
      it('does not insert when a row already exists', async () => {
         const { tx, select, insert, del } = makeTx([{ id: 'existing-row' }]);

         await syncTwoFactorRow(tx, 'user-1', true);

         expect(select).toHaveBeenCalledTimes(1);
         expect(insert).not.toHaveBeenCalled();
         expect(del).not.toHaveBeenCalled();
      });

      it('inserts a verified row when none exists', async () => {
         const { tx, insert, values } = makeTx([]);

         await syncTwoFactorRow(tx, 'user-1', true);

         expect(insert).toHaveBeenCalledWith(twoFactor);
         expect(values).toHaveBeenCalledTimes(1);
         expect(values).toHaveBeenCalledWith(
            expect.objectContaining({
               userId: 'user-1',
               backupCodes: '[]',
               verified: true,
            }),
         );
      });

      it('generates a hex id and a 64-char hex secret', async () => {
         const { tx, values } = makeTx([]);

         await syncTwoFactorRow(tx, 'user-1', true);

         const row = values.mock.calls[0][0];
         expect(row.id).toMatch(/^[0-9a-f]{32}$/);
         expect(row.secret).toMatch(/^[0-9a-f]{64}$/);
      });

      it('generates a different secret for each user', async () => {
         const a = makeTx([]);
         const b = makeTx([]);

         await syncTwoFactorRow(a.tx, 'user-1', true);
         await syncTwoFactorRow(b.tx, 'user-2', true);

         const rowA = a.values.mock.calls[0][0];
         const rowB = b.values.mock.calls[0][0];
         expect(rowA.secret).not.toBe(rowB.secret);
         expect(rowA.id).not.toBe(rowB.id);
      });

      it('does not delete anything', async () => {
         const { tx, del } = makeTx([]);

         await syncTwoFactorRow(tx, 'user-1', true);

         expect(del).not.toHaveBeenCalled();
      });
   });
});
