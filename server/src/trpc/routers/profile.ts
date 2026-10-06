import { TRPCError } from '@trpc/server';
import { contributionStatsSchema, uploadAvatarSchema } from '@folio/shared';
import { router, protectedProcedure } from '@/trpc/trpc.js';
import cloudinary from '@/lib/cloudinary.js';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { documents, transcriptions } from '@/db/schema/index.js';

const avatarPublicId = (userId: string) => `avatars/${userId}`;

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

   removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
      try {
         await cloudinary.uploader.destroy(avatarPublicId(ctx.user.id), {
            invalidate: true,
         });
      } catch {
         throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not remove avatar',
         });
      }
      return { success: true };
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
});
