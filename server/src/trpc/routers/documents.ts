import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { documents } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary.js';
import { TRPCError } from '@trpc/server';
import { listDocumentsSchema, uploadDocumentSchema } from '@folio/shared';
import { isContributor } from '@folio/shared';

export const documentsRouter = router({
   // POST request
   upload: protectedProcedure
      .input(uploadDocumentSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can upload documents',
            });
         }

         const uploaded = await cloudinary.uploader.upload(input.fileBase64, {
            folder: 'folio',
            resource_type: 'auto',
         });

         const [doc] = await ctx.db
            .insert(documents)
            .values({
               id: crypto.randomUUID(),
               title: input.title,
               description: input.description,
               uploadedBy: ctx.user.id,
               cloudinaryPublicId: uploaded.public_id,
               cloudinaryUrl: uploaded.secure_url,
               version: 1,
            })
            .returning();

         return doc;
      }),

   list: publicProcedure
      .input(listDocumentsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const results = await ctx.db
            .select()
            .from(documents)
            .limit(input.limit)
            .offset(offset)
            .orderBy(documents.createdAt);

         return results;
      }),

   getById: publicProcedure
      .input(
         z.object({
            id: z.string(),
         }),
      )
      .query(async ({ ctx, input }) => {
         const [doc] = await ctx.db
            .select()
            .from(documents)
            .where(eq(documents.id, input.id));

         if (!doc) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }
         return doc;
      }),
});
