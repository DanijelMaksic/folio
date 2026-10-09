import { db } from '@/db/index.js'; // drizzle instance
import * as schema from '@/db/schema/index.js';
import { betterAuth } from 'better-auth/minimal';
import { sendVerificationEmail, sendOtpEmail } from './email.js';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { count, eq } from 'drizzle-orm';
import { user as userTable } from '@/db/schema/index.js';
import { deleteUserContent } from '@/lib/delete-user-content.js';

export const auth = betterAuth({
   appName: 'Folio',
   baseURL: process.env.BETTER_AUTH_URL,
   secret: process.env.BETTER_AUTH_SECRET,
   database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
         ...schema,
         user: schema.user,
      },
   }),
   emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
   },
   emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
         await sendVerificationEmail(user.email, url);
      },
      autoSignInAfterVerification: true,
   },
   user: {
      additionalFields: {
         username: {
            type: 'string',
            required: true,
            unique: true,
         },
         globalRole: {
            type: 'string',
            required: false,
            defaultValue: 'viewer',
         },
      },
      deleteUser: {
         enabled: true,
         beforeDelete: async (u) => {
            // Don't let the last admin lock everyone out of role management
            const [self] = await db
               .select({ role: userTable.globalRole })
               .from(userTable)
               .where(eq(userTable.id, u.id));

            if (self?.role === 'admin') {
               const [{ n }] = await db
                  .select({ n: count() })
                  .from(userTable)
                  .where(eq(userTable.globalRole, 'admin'));
               if (n <= 1) {
                  throw new APIError('BAD_REQUEST', {
                     message:
                        'You are the only admin. Promote someone else first.',
                  });
               }
            }

            await deleteUserContent(u.id);
         },
      },
   },
   plugins: [
      twoFactor({
         skipVerificationOnEnable: true,
         otpOptions: {
            async sendOTP({ user, otp }) {
               await sendOtpEmail(user.email, otp);
            },
            period: 600, // 10 minutes in seconds
         },
      }),
   ],
   trustedOrigins: [process.env.CLIENT_URL!],
});

export type Auth = typeof auth;
