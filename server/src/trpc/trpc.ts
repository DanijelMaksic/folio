import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

// tRPC initialization file

// <Context> gives us autocompletion and type-checking on ctx.user. Shape of Context: { req, res, db, user, session }
const t = initTRPC.context<Context>().create();

export const router = t.router; // router builder
export const publicProcedure = t.procedure;

// Authorization boundary middleware
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
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

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
   if (ctx.user.globalRole !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
   }
   return next({ ctx });
});

export const createCallerFactory = t.createCallerFactory;
