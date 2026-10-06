import { TRPCError } from '@trpc/server';
import { contributionStatsSchema, uploadAvatarSchema } from '@folio/shared';
import { router, protectedProcedure } from '@/trpc/trpc.js';
import cloudinary from '@/lib/cloudinary.js';
import { db } from '@/db/index.js';
import { documents, transcriptions } from '@/db/schema/index.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { roleRequestSchema, requestRoleSchema } from '@folio/shared';
import { roleRequests } from '@/db/schema/index.js';

const avatarPublicId = (userId: string) => `avatars/${userId}`;

const NEXT_ROLE = { viewer: 'contributor', contributor: 'editor' } as const;

export const profileRouter = router({
   uploadAvatar: protectedProcedure
      .input(uploadAvatarSchema)
      .mutation(async ({ ctx, input }) => {
         try {
            const result = await cloudinary.uploader.upload(input.fileBase64, {
               public_id: avatarPublicId(ctx.user.id),
               overwrite: true,
               invalidate: true,
               resource_type: 'image',
               transformation: [
                  {
                     width: 400,
                     height: 400,
                     crop: 'fill',
                     gravity: 'auto',
                  },
                  { quality: 'auto', fetch_format: 'auto' },
               ],
            });
            return { imageUrl: result.secure_url };
         } catch {
            throw new TRPCError({
               code: 'INTERNAL_SERVER_ERROR',
               message: 'Could not upload avatar',
            });
         }
      }),

   getStats: protectedProcedure
      .output(contributionStatsSchema)
      .query(async ({ ctx }) => {
         const [[docRow], [txRow]] = await Promise.all([
            db
               .select({ count: sql<number>`COUNT(*)::int` })
               .from(documents)
               .where(eq(documents.uploadedBy, ctx.user.id)),
            db
               .select({
                  total: sql<number>`COUNT(*)::int`,
                  approved: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'approved' THEN 1 END)::int`,
                  submitted: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'submitted' THEN 1 END)::int`,
                  rejected: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'rejected' THEN 1 END)::int`,
                  drafts: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'draft' THEN 1 END)::int`,
               })
               .from(transcriptions)
               .where(eq(transcriptions.userId, ctx.user.id)),
         ]);

         return {
            documentsUploaded: docRow?.count ?? 0,
            totalTranscriptions: txRow?.total ?? 0,
            approved: txRow?.approved ?? 0,
            submitted: txRow?.submitted ?? 0,
            rejected: txRow?.rejected ?? 0,
            drafts: txRow?.drafts ?? 0,
         };
      }),

   getMyRoleRequest: protectedProcedure
      .output(roleRequestSchema.nullable())
      .query(async ({ ctx }) => {
         const [row] = await db
            .select()
            .from(roleRequests)
            .where(eq(roleRequests.userId, ctx.user.id))
            .orderBy(desc(roleRequests.createdAt))
            .limit(1);

         if (!row) return null;
         return {
            id: row.id,
            requestedRole: row.requestedRole,
            message: row.message,
            status: row.status,
            rejectionReason: row.rejectionReason,
            createdAt: row.createdAt.toISOString(),
            reviewedAt: row.reviewedAt?.toISOString() ?? null,
         };
      }),

   requestRole: protectedProcedure
      .input(requestRoleSchema)
      .mutation(async ({ ctx, input }) => {
         const targetRole =
            NEXT_ROLE[ctx.user.globalRole as keyof typeof NEXT_ROLE];
         if (!targetRole) {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'There is no higher role you can request',
            });
         }

         const [existing] = await db
            .select({ id: roleRequests.id })
            .from(roleRequests)
            .where(
               and(
                  eq(roleRequests.userId, ctx.user.id),
                  eq(roleRequests.status, 'pending'),
               ),
            )
            .limit(1);

         if (existing) {
            throw new TRPCError({
               code: 'CONFLICT',
               message: 'You already have a pending request',
            });
         }

         try {
            await db.insert(roleRequests).values({
               userId: ctx.user.id,
               requestedRole: targetRole,
               message: input.message,
            });
         } catch (err) {
            // Two simultaneous submits: the partial unique index catches the loser
            if ((err as { code?: string }).code === '23505') {
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'You already have a pending request',
               });
            }
            throw err;
         }

         return { success: true };
      }),
});
