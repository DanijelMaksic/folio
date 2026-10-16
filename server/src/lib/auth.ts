import { db } from '@/db/index.js'; // drizzle instance
import * as schema from '@/db/schema/index.js';
import { betterAuth } from 'better-auth/minimal';
import { sendVerificationEmail, sendOtpEmail } from './email.js';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { count, eq } from 'drizzle-orm';
import { user as userTable } from '@/db/schema/index.js';
import { deleteUserContent } from '@/lib/delete-user-content.js';
import { passwordSchema } from '@folio/shared';

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
   hooks: {
      before: createAuthMiddleware(async (ctx) => {
         let password: unknown;
         if (ctx.path === '/sign-up/email') password = ctx.body?.password;
         else if (
            ctx.path === '/change-password' ||
            ctx.path === '/reset-password'
         )
            password = ctx.body?.newPassword;
         else return;

         const result = passwordSchema.safeParse(password);
         if (!result.success) {
            throw new APIError('BAD_REQUEST', {
               message: result.error.issues[0].message,
               code: 'PASSWORD_TOO_WEAK',
            });
         }
      }),
   },
   rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
         '/sign-in/email': { window: 60, max: 5 },
         '/sign-up/email': { window: 60, max: 5 },
         '/two-factor/send-otp': { window: 60, max: 3 },
         '/two-factor/verify-otp': { window: 60, max: 5 },
      },
   },
});

export type Auth = typeof auth;
