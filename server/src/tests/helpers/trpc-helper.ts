import { createCallerFactory } from '@/trpc/trpc.js';
import { appRouter } from '@/trpc/router.js';

const createCaller = createCallerFactory(appRouter);

export function createUnauthenticatedCaller() {
   return createCaller({ session: null } as any);
}

export function createAuthenticatedCaller(user: {
   id: string;
   globalRole: string;
   email: string;
   username: string;
}) {
   return createCaller({
      session: {
         user,
         session: { id: 'test-session' } as any,
      },
   } as any);
}
