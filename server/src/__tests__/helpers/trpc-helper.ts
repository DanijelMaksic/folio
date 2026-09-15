import { createCallerFactory } from '@/trpc/trpc.js';
import { appRouter } from '@/trpc/router.js';
import { db } from '@/db/index.js';

const createCaller = createCallerFactory(appRouter);

export function createUnauthenticatedCaller() {
   return createCaller({ session: null, user: null, db } as any);
}

export function createAuthenticatedCaller(user: {
   id: string;
   globalRole: string;
   email: string;
   username: string;
}) {
   return createCaller({
      session: { id: 'test-session' } as any,
      user: user as any,
      db,
   } as any);
}
