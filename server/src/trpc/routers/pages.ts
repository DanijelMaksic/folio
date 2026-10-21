import { db } from '@/db/index.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import cloudinary from '@/lib/cloudinary.js';
import { escapeLike } from '@/lib/search.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   addPagesSchema,
   getByDocumentSchema,
   getByPageNumberSchema,
   isContributor,
   isEditor,
   replaceImageSchema,
   updatePageSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, count, eq, gt, ilike, or, sql } from 'drizzle-orm';
import z from 'zod';

export const pagesRouter = router({
   // Returns all pages for a document with per-page transcription status for the current user
   getByDocument: publicProcedure
      .input(getByDocumentSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const approvedExists = sql`EXISTS (
             SELECT 1 FROM ${transcriptions}
             WHERE ${transcriptions.pageId} = ${pages.id}
             AND ${transcriptions.status} = 'approved'
             )`;

         const term = input.search?.trim();
         const pattern = term ? `%${escapeLike(term)}%` : undefined;

         const searchFilter = pattern
            ? or(ilike(pages.title, pattern), ilike(pages.description, pattern))
            : undefined;

         const where = and(
            eq(pages.documentId, input.documentId),
            searchFilter,
            input.status === 'transcribed' ? approvedExists : undefined,
            input.status === 'not-transcribed'
               ? sql`NOT ${approvedExists}`
               : undefined,
         );

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: pages.id,
                  pageNumber: pages.pageNumber,
                  imageUrl: pages.imageUrl,
                  title: pages.title,
                  createdAt: pages.createdAt,
                  approvedTranscriptionCount: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'approved' THEN 1 END)::int`,
               })
               .from(pages)
               .leftJoin(transcriptions, eq(transcriptions.pageId, pages.id))
               .where(where)
               .groupBy(
                  pages.id,
                  pages.pageNumber,
                  pages.imageUrl,
                  pages.title,
                  pages.createdAt,
               )
               .orderBy(asc(pages.pageNumber))
               .limit(input.limit)
               .offset(offset),

            db.select({ total: count() }).from(pages).where(where),
         ]);

         return {
            pages: results,
            totalCount: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
         };
      }),

   // Returns a single page by id
   getById: publicProcedure
      .input(z.object({ pageId: z.string() }))
      .query(async ({ ctx, input }) => {
         const [page] = await db
            .select()
            .from(pages)
            .where(eq(pages.id, input.pageId))
            .limit(1);

         if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

         return page;
      }),

   // Returns a single page by document id and page number — used for URL-based navigation
   getByPageNumber: publicProcedure
      .input(getByPageNumberSchema)
      .query(async ({ ctx, input }) => {
         const [page] = await db
            .select()
            .from(pages)
            .where(
               and(
                  eq(pages.documentId, input.documentId),
                  eq(pages.pageNumber, input.pageNumber),
               ),
            )
            .limit(1);

         if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

         return page;
      }),

   update: protectedProcedure
      .input(updatePageSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can edit pages',
            });
         }

         const { id, ...fields } = input;

         const [page] = await db
            .select({ id: pages.id, uploadedBy: documents.uploadedBy })
            .from(pages)
            .innerJoin(documents, eq(documents.id, pages.documentId))
            .where(eq(pages.id, id));

         if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

         if (
            page.uploadedBy !== ctx.user.id &&
            !isEditor(ctx.user.globalRole)
         ) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'You do not have permission to edit this page',
            });
         }

         const [updated] = await db
            .update(pages)
            .set(fields)
            .where(eq(pages.id, id))
            .returning();

         if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });

         return updated;
      }),

   delete: protectedProcedure
      .input(z.object({ pageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const [page] = await db
            .select({
               id: pages.id,
               pageNumber: pages.pageNumber,
               documentId: pages.documentId,
               cloudinaryPublicId: pages.cloudinaryPublicId,
               uploadedBy: documents.uploadedBy,
            })
            .from(pages)
            .innerJoin(documents, eq(documents.id, pages.documentId))
            .where(eq(pages.id, input.pageId));

         if (!page) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Page not found',
            });
         }

         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can delete pages',
            });
         }

         const isMyDocument = page.uploadedBy === ctx.user.id;
         if (!isMyDocument && !isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'You do not have permission to delete this page',
            });
         }

         const [deleted] = await db
            .delete(pages)
            .where(eq(pages.id, input.pageId))
            .returning();

         if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' });

         // Renumber remaining pages after the deleted one
         await db
            .update(pages)
            .set({
               pageNumber: sql`${pages.pageNumber} - 1`,
               title: sql`
                  CASE
                     WHEN ${pages.title} = 'Page ' || ${pages.pageNumber}::text
                     THEN 'Page ' || (${pages.pageNumber} - 1)::text
                     ELSE ${pages.title}
                  END
               `,
            })
            .where(
               and(
                  eq(pages.documentId, page.documentId!),
                  gt(pages.pageNumber, page.pageNumber),
               ),
            );

         try {
            await cloudinary.uploader.destroy(page.cloudinaryPublicId);
         } catch (err) {
            console.error('Failed to delete page image:', err);
         }

         return deleted;
      }),

   addPages: protectedProcedure
      .input(addPagesSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can delete documents',
            });
         }

         const document = await db.query.documents.findFirst({
            where: eq(documents.id, input.documentId),
         });

         if (!document) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Document not found',
            });
         }

         if (
            document.uploadedBy !== ctx.user.id &&
            !isEditor(ctx.user.globalRole)
         ) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message:
                  'You do not have permission to add pages to this document',
            });
         }

         const [result] = await db
            .select({ maxPage: sql<number>`Max(${pages.pageNumber})` })
            .from(pages)
            .where(eq(pages.documentId, input.documentId));

         const startingPageNumber = (result?.maxPage ?? 0) + 1;

         for (let i = 0; i < input.files.length; i++) {
            const uploaded = await cloudinary.uploader.upload(input.files[i], {
               folder: 'folio/documents',
               resource_type: 'image',
            });

            await db.insert(pages).values({
               documentId: input.documentId,
               pageNumber: startingPageNumber + i,
               title: `Page ${startingPageNumber + i}`,
               imageUrl: uploaded.secure_url,
               cloudinaryPublicId: uploaded.public_id,
            });
         }

         return { added: input.files.length };
      }),

   replaceImage: protectedProcedure
      .input(replaceImageSchema)
      .mutation(async ({ ctx, input }) => {
         const [page] = await db
            .select({
               id: pages.id,
               cloudinaryPublicId: pages.cloudinaryPublicId,
               uploadedBy: documents.uploadedBy,
            })
            .from(pages)
            .innerJoin(documents, eq(documents.id, pages.documentId))
            .where(eq(pages.id, input.pageId));

         if (!page) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Page not found',
            });
         }

         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can replace images',
            });
         }

         const isMyDocument = page.uploadedBy === ctx.user.id;

         if (!isMyDocument && !isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'You do not have permission to replace this image',
            });
         }

         // Upload the new image first, so a failed upload leaves the page untouched
         const uploaded = await cloudinary.uploader.upload(input.fileBase64, {
            folder: 'folio/documents',
            resource_type: 'image',
         });

         let updated;
         try {
            [updated] = await db
               .update(pages)
               .set({
                  imageUrl: uploaded.secure_url,
                  cloudinaryPublicId: uploaded.public_id,
               })
               .where(eq(pages.id, input.pageId))
               .returning();
         } catch (err) {
            // DB update failed: remove the new image and keep the old one
            try {
               await cloudinary.uploader.destroy(uploaded.public_id);
            } catch (cleanupErr) {
               console.error('Failed to delete orphaned image:', cleanupErr);
            }
            throw err;
         }

         if (!updated) {
            // Page was deleted in the meantime: remove the new image
            try {
               await cloudinary.uploader.destroy(uploaded.public_id);
            } catch (cleanupErr) {
               console.error('Failed to delete orphaned image:', cleanupErr);
            }
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Page not found',
            });
         }

         // The DB now points at the new image, so removing the old one is best-effort
         try {
            await cloudinary.uploader.destroy(page.cloudinaryPublicId);
         } catch (err) {
            console.error('Failed to delete old image:', err);
         }

         return updated;
      }),
});
