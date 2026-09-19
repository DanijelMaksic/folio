import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { documents, transcriptions, user } from '@/db/schema/index.js';
import { and, desc, eq, ilike, isNotNull, sql } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary.js';
import { TRPCError } from '@trpc/server';
import {
   listDocumentsSchema,
   searchDocumentsSchema,
   updateDocumentSchema,
   uploadDocumentSchema,
} from '@folio/shared';
import { isContributor } from '@folio/shared';
import { db } from '@/db/index.js';
import { count } from 'drizzle-orm';

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
            folder: 'folio/documents',
            resource_type: 'auto',
         });

         const [doc] = await db
            .insert(documents)
            .values({
               title: input.title,
               description: input.description,
               uploadedBy: ctx.user.id,
               cloudinaryPublicId: uploaded.public_id,
               cloudinaryUrl: uploaded.secure_url,
            })
            .returning();

         return doc;
      }),

   list: publicProcedure
      .input(listDocumentsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const [results, [{ total }]] = await Promise.all([
            db
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
               .orderBy(desc(documents.createdAt)),

            db.select({ total: count() }).from(documents),
         ]);

         return {
            documents: results,
            totalCount: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
         };
      }),

   getByCollection: publicProcedure
      .input(z.object({ collectionId: z.string() }))
      .query(async ({ ctx, input }) => {
         const results = db
            .select()
            .from(documents)
            .where(eq(documents.collectionId, input.collectionId));

         return results ?? null;
      }),

   update: protectedProcedure
      .input(updateDocumentSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can edit documents',
            });
         }

         const { id, ...fields } = input;

         const [updated] = await db
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

         const [deleted] = await db
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
         const [doc] = await db
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
         const results = await db
            .select({
               id: documents.id,
               title: documents.title,
               description: documents.description,
               uploadedBy: documents.uploadedBy,
               uploaderName: user.username,
               collectionId: documents.collectionId,
               cloudinaryUrl: documents.cloudinaryUrl,
               cloudinaryPublicId: documents.cloudinaryPublicId,
               status: documents.status,
               createdAt: documents.createdAt,
               updatedAt: documents.updatedAt,
            })
            .from(documents)
            .leftJoin(user, eq(documents.uploadedBy, user.id))
            .where(
               and(
                  ilike(documents.title, `%${input.query}%`),
                  input.collectionId
                     ? eq(documents.collectionId, input.collectionId)
                     : undefined,
               ),
            )
            .limit(20);

         return results;
      }),
});
