import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { router, adminProcedure } from '@/trpc/trpc.js';
import { roleRequests, user } from '@/db/schema/index.js';
import { TRPCError } from '@trpc/server';
import {
   adminRoleRequestSchema,
   GLOBAL_ROLES,
   isEditor,
   reviewRoleRequestSchema,
} from '@folio/shared';
import { db } from '@/db/index.js';
import {
   sendRoleRequestApprovedEmail,
   sendRoleRequestRejectedEmail,
} from '@/lib/email.js';

export const adminRouter = router({
   setUserRole: adminProcedure
      .input(
         z.object({
            userId: z.string(),
            role: z.enum(GLOBAL_ROLES),
         }),
      )
      .mutation(async ({ ctx, input }) => {
         // Determines whether the new role requires 2FA
         const twoFactorEnabled = isEditor(input.role);

         await db
            .update(user)
            .set({ globalRole: input.role, twoFactorEnabled })
            .where(eq(user.id, input.userId));

         return { success: true };
      }),

   listRoleRequests: adminProcedure
      .output(z.array(adminRoleRequestSchema))
      .query(async () => {
         const rows = await db
            .select({
               id: roleRequests.id,
               userId: roleRequests.userId,
               requestedRole: roleRequests.requestedRole,
               message: roleRequests.message,
               status: roleRequests.status,
               rejectionReason: roleRequests.rejectionReason,
               createdAt: roleRequests.createdAt,
               reviewedAt: roleRequests.reviewedAt,
               username: user.username,
               name: user.name,
               email: user.email,
               currentRole: user.globalRole,
            })
            .from(roleRequests)
            .innerJoin(user, eq(roleRequests.userId, user.id))
            .where(eq(roleRequests.status, 'pending'))
            .orderBy(asc(roleRequests.createdAt));

         return rows.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            reviewedAt: r.reviewedAt?.toISOString() ?? null,
         }));
      }),

   approveRoleRequest: adminProcedure
      .input(reviewRoleRequestSchema)
      .mutation(async ({ ctx, input }) => {
         const [request] = await db
            .select({
               id: roleRequests.id,
               userId: roleRequests.userId,
               requestedRole: roleRequests.requestedRole,
               status: roleRequests.status,
               email: user.email,
            })
            .from(roleRequests)
            .innerJoin(user, eq(roleRequests.userId, user.id))
            .where(eq(roleRequests.id, input.id))
            .limit(1);

         if (!request) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Request not found',
            });
         }
         if (request.status !== 'pending') {
            throw new TRPCError({
               code: 'CONFLICT',
               message: 'This request has already been reviewed',
            });
         }

         await db.transaction(async (tx) => {
            await tx
               .update(user)
               .set({
                  globalRole: request.requestedRole,
                  // Editors must use email OTP on every login
                  ...(request.requestedRole === 'editor'
                     ? { twoFactorEnabled: true }
                     : {}),
               })
               .where(eq(user.id, request.userId));

            await tx
               .update(roleRequests)
               .set({
                  status: 'approved',
                  reviewedBy: ctx.user.id,
                  reviewedAt: new Date(),
               })
               .where(
                  and(
                     eq(roleRequests.id, request.id),
                     eq(roleRequests.status, 'pending'),
                  ),
               );
         });

         // A failed email must not undo a completed approval
         try {
            await sendRoleRequestApprovedEmail(
               request.email,
               request.requestedRole,
            );
         } catch (err) {
            console.error('Role approval email failed:', err);
         }

         return { success: true };
      }),

   rejectRoleRequest: adminProcedure
      .input(reviewRoleRequestSchema)
      .mutation(async ({ ctx, input }) => {
         const [request] = await db
            .select({
               id: roleRequests.id,
               status: roleRequests.status,
               email: user.email,
            })
            .from(roleRequests)
            .innerJoin(user, eq(roleRequests.userId, user.id))
            .where(eq(roleRequests.id, input.id))
            .limit(1);

         if (!request) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Request not found',
            });
         }
         if (request.status !== 'pending') {
            throw new TRPCError({
               code: 'CONFLICT',
               message: 'This request has already been reviewed',
            });
         }

         await db
            .update(roleRequests)
            .set({
               status: 'rejected',
               rejectionReason: input.reason || null,
               reviewedBy: ctx.user.id,
               reviewedAt: new Date(),
            })
            .where(
               and(
                  eq(roleRequests.id, request.id),
                  eq(roleRequests.status, 'pending'),
               ),
            );

         try {
            await sendRoleRequestRejectedEmail(request.email, input.reason);
         } catch (err) {
            console.error('Role rejection email failed:', err);
         }

         return { success: true };
      }),
});
