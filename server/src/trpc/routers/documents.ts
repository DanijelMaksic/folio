import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { documents, pages } from '@/db/schema/index.js';
import { user } from '@/db/schema/index.js';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
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
import { pdfQueue } from '@/lib/queue.js';

const coverImageSubquery = (documentId: string) => sql<string | null>`(
  SELECT image_url FROM document_pages
  WHERE document_id = ${documentId}
  AND page_number = 1
  LIMIT 1
)`;

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

         if (input.fileType === 'pdf') {
            const [doc] = await db
               .insert(documents)
               .values({
                  title: input.title,
                  description: input.description ?? null,
                  uploadedBy: ctx.user.id,
                  status: 'processing',
               })
               .returning();

            await pdfQueue.add('process-pdf', {
               documentId: doc.id,
               fileBase64: input.fileBase64,
            });

            return doc;
         }

         // Single image — upload to Cloudinary and create page immediately
         const uploaded = await cloudinary.uploader.upload(input.fileBase64, {
            folder: 'folio/documents',
            resource_type: 'image',
         });

         const [doc] = await db
            .insert(documents)
            .values({
               title: input.title,
               description: input.description ?? null,
               uploadedBy: ctx.user.id,
               status: 'ready',
            })
            .returning();

         await db.insert(pages).values({
            documentId: doc.id,
            pageNumber: 1,
            imageUrl: uploaded.secure_url,
            cloudinaryPublicId: uploaded.public_id,
         });

         return doc;
      }),

   list: publicProcedure
      .input(listDocumentsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const where = input.search
            ? ilike(documents.title, `%${input.search}%`)
            : undefined;

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: documents.id,
                  title: documents.title,
                  description: documents.description,
                  uploadedBy: documents.uploadedBy,
                  collectionId: documents.collectionId,
                  status: documents.status,
                  createdAt: documents.createdAt,
                  updatedAt: documents.updatedAt,
                  uploaderName: user.name,
                  coverImageUrl: sql<string | null>`(
              SELECT image_url FROM document_pages
              WHERE document_id = ${documents.id}
              AND page_number = 1
              LIMIT 1
            )`,
                  pageCount: sql<number>`(
              SELECT COUNT(*) FROM document_pages
              WHERE document_id = ${documents.id}
            )`,
               })
               .from(documents)
               .innerJoin(user, eq(user.id, documents.uploadedBy))
               .where(where)
               .limit(input.limit)
               .offset(offset)
               .orderBy(desc(documents.createdAt)),

            db.select({ total: count() }).from(documents).where(where),
         ]);

         return {
            documents: results,
            totalCount: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
         };
      }),

   getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
         const [doc] = await db
            .select({
               id: documents.id,
               title: documents.title,
               description: documents.description,
               uploadedBy: documents.uploadedBy,
               collectionId: documents.collectionId,
               status: documents.status,
               createdAt: documents.createdAt,
               updatedAt: documents.updatedAt,
               uploaderName: user.name,
               coverImageUrl: sql<string | null>`(
            SELECT image_url FROM document_pages
            WHERE document_id = ${documents.id}
            AND page_number = 1
            LIMIT 1
          )`,
               pageCount: sql<number>`(
            SELECT COUNT(*) FROM document_pages
            WHERE document_id = ${documents.id}
          )`,
            })
            .from(documents)
            .innerJoin(user, eq(user.id, documents.uploadedBy))
            .where(eq(documents.id, input.id));

         if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });

         return doc;
      }),

   getByCollection: publicProcedure
      .input(z.object({ collectionId: z.string() }))
      .query(async ({ ctx, input }) => {
         const results = await db
            .select({
               id: documents.id,
               title: documents.title,
               description: documents.description,
               uploadedBy: documents.uploadedBy,
               collectionId: documents.collectionId,
               status: documents.status,
               createdAt: documents.createdAt,
               updatedAt: documents.updatedAt,
               coverImageUrl: sql<string | null>`(
            SELECT image_url FROM document_pages
            WHERE document_id = ${documents.id}
            AND page_number = 1
            LIMIT 1
          )`,
               pageCount: sql<number>`(
            SELECT COUNT(*) FROM document_pages
            WHERE document_id = ${documents.id}
          )`,
            })
            .from(documents)
            .where(eq(documents.collectionId, input.collectionId));

         return results;
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

         if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });

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

         if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' });

         return deleted;
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
               uploaderName: user.name,
               collectionId: documents.collectionId,
               status: documents.status,
               createdAt: documents.createdAt,
               updatedAt: documents.updatedAt,
               coverImageUrl: sql<string | null>`(
            SELECT image_url FROM document_pages
            WHERE document_id = ${documents.id}
            AND page_number = 1
            LIMIT 1
          )`,
               pageCount: sql<number>`(
            SELECT COUNT(*) FROM document_pages
            WHERE document_id = ${documents.id}
          )`,
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
