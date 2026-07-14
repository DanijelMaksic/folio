import { db } from '@/db/index.js'; // drizzle instance
import * as schema from '@/db/schema.js';
import { betterAuth } from 'better-auth';
import { sendVerificationEmail } from './email.js';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
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
   },
   trustedOrigins: [process.env.CLIENT_URL!],
});

export type Auth = typeof auth;
