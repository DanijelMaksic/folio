import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from '../../../server/src/lib/auth.js';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
   baseURL: import.meta.env.VITE_API_URL,
   plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
