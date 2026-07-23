import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '@/trpc/trpc.js';
import { user } from '@/db/schema.js';
import { TRPCError } from '@trpc/server';

// 'as const' is a const assertion that forces the compiler to infer the narrowest, most specific literal type possible for an expression rather than widening it to a general type like string or number
const elevatedRoles = ['editor', 'admin'] as const;
// Without 'as const', TypeScript infers ['editor', 'admin'] as string[], which would be unusable in .includes() down below

export const adminRouter = router({
   setUserRole: protectedProcedure
      .input(
         z.object({
            userId: z.string(),
            role: z.enum(['viewer', 'contributor', 'editor', 'admin']),
         }),
      )
      .mutation(async ({ ctx, input }) => {
         if (ctx.user.globalRole !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
         }

         // Determines whether the new role requires 2FA
         const twoFactorEnabled = elevatedRoles.includes(
            input.role as (typeof elevatedRoles)[number],
         );

         await ctx.db
            .update(user)
            .set({
               globalRole: input.role,
               twoFactorEnabled,
            })
            .where(eq(user.id, input.userId));

         return { success: true };
      }),
});
