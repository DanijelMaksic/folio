import { db } from '@/db/index.js'; // drizzle instance
import * as schema from '@/db/schema.js';
import { betterAuth } from 'better-auth/minimal';
import { sendVerificationEmail, sendOtpEmail } from './email.js';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
   appName: 'Folio',
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
