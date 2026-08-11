import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '@/trpc/trpc.js';
import { user } from '@/db/schema/index.js';
import { TRPCError } from '@trpc/server';
import { GLOBAL_ROLES, isEditor } from '@folio/shared';

export const adminRouter = router({
   setUserRole: protectedProcedure
      .input(
         z.object({
            userId: z.string(),
            role: z.enum(GLOBAL_ROLES),
         }),
      )
      .mutation(async ({ ctx, input }) => {
         if (ctx.user.globalRole !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
         }

         // Determines whether the new role requires 2FA
         const twoFactorEnabled = isEditor(input.role);

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
