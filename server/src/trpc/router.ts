import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

// tRPC initialization file

// <Context> gives us autocompletion and type-checking on ctx.user. Shape of Context: { req, res, db, user, session }
const t = initTRPC.context<Context>().create();

export const router = t.router; // router builder
export const publicProcedure = t.procedure;

// Authorization boundary middleware
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
   // Checks if the user exists, if it doesn't, tRPC throws the 401 error response
   if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
   }
   // If the user exists it will be available for procedures to accesss
   return next({
      ctx: {
         ...ctx,
         user: ctx.user,
      },
   });
});

// API endpoints
export const appRouter = router({});

// This line ensures type safety across client and server, and it is this AppRouter type that we'll use in client
export type AppRouter = typeof appRouter;
