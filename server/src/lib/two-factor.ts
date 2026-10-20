// lib/two-factor.ts
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { twoFactor } from '@/db/schema/auth.js';

// Works with db or a transaction handle
type Executor = Pick<
   typeof import('@/db/index.js').db,
   'select' | 'insert' | 'delete'
>;

export async function syncTwoFactorRow(
   tx: Executor,
   userId: string,
   enabled: boolean,
) {
   if (!enabled) {
      await tx.delete(twoFactor).where(eq(twoFactor.userId, userId));
      return;
   }

   const [existing] = await tx
      .select({ id: twoFactor.id })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);

   if (existing) return;

   await tx.insert(twoFactor).values({
      id: randomBytes(16).toString('hex'),
      userId,
      secret: randomBytes(32).toString('hex'),
      backupCodes: JSON.stringify([]),
      verified: true,
   });
}
