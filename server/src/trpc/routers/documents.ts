import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { documents, transcriptions, user } from '@/db/schema/index.js';
import { and, eq, ilike, isNotNull } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary.js';
import { TRPCError } from '@trpc/server';
import {
   listDocumentsSchema,
   searchDocumentsSchema,
   updateCollectionSchema,
   uploadDocumentSchema,
} from '@folio/shared';
import { isContributor } from '@folio/shared';

export const documentsRouter = router({
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
            .select({
               id: documents.id,
               title: documents.title,
               status: documents.status,
               cloudinaryUrl: documents.cloudinaryUrl,
               uploaderName: user.name,
               createdAt: documents.createdAt,
               hasApprovedTranscription: isNotNull(transcriptions.id),
            })
            .from(documents)
            .innerJoin(user, eq(user.id, documents.uploadedBy))
            .leftJoin(
               transcriptions,
               and(
                  eq(transcriptions.documentId, documents.id),
                  eq(transcriptions.status, 'approved'),
               ),
            )
            .limit(input.limit)
            .offset(offset)
            .orderBy(documents.createdAt);

         return results;
      }),

   update: protectedProcedure
      .input(updateCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can edit documents',
            });
         }

         const { id, ...fields } = input;

         const [updated] = await ctx.db
            .update(documents)
            .set(fields)
            .where(eq(documents.id, id))
            .returning();

         if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }

         return updated;
      }),

   delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can delete documents',
            });
         }

         const [deleted] = await ctx.db
            .delete(documents)
            .where(eq(documents.id, input.id))
            .returning();

         if (!deleted) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }

         return deleted;
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

   search: publicProcedure
      .input(searchDocumentsSchema)
      .query(async ({ ctx, input }) => {
         const results = await ctx.db
            .select()
            .from(documents)
            .where(ilike(documents.title, `%${input.query}%`));

         return results;
      }),
});
