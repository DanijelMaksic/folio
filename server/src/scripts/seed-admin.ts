import 'dotenv/config';
import { db } from '@/db/index.js';
import { twoFactor, user } from '@/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const email = process.argv[2];

if (!email) {
   console.error('Usage: npm run seed:admin <email>');
   process.exit(1);
}

async function main() {
   const target = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .then((rows) => rows[0]);

   if (!target) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
   }

   await db
      .update(user)
      .set({ globalRole: 'admin', twoFactorEnabled: true })
      .where(eq(user.email, email));

   const existing = await db
      .select()
      .from(twoFactor)
      .where(eq(twoFactor.userId, target.id))
      .then((rows) => rows[0]);

   if (!existing) {
      await db.insert(twoFactor).values({
         id: randomBytes(16).toString('hex'),
         userId: target.id,
         secret: randomBytes(32).toString('hex'),
         backupCodes: JSON.stringify([]),
         verified: true,
      });
   }

   console.log(`✓ ${email} is now an admin with 2FA enabled`);
   process.exit(0);
}

main();
