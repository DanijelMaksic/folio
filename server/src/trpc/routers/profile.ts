import { TRPCError } from '@trpc/server';
import { uploadAvatarSchema } from '@folio/shared';
import { router, protectedProcedure } from '@/trpc/trpc.js';
import cloudinary from '@/lib/cloudinary.js';

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
});
