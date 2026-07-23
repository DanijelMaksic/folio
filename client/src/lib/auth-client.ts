import {
   inferAdditionalFields,
   twoFactorClient,
} from 'better-auth/client/plugins';
import type { Auth } from '../../../server/src/lib/auth.js';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
   baseURL: import.meta.env.VITE_API_URL,
   plugins: [
      inferAdditionalFields<Auth>(),
      twoFactorClient({
         onTwoFactorRedirect() {
            window.location.href = '/verify-otp';
         },
      }),
   ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
