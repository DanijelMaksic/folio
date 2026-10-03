import { db } from '@/db/index.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import cloudinary from '@/lib/cloudinary.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   addPagesSchema,
   isContributor,
   isEditor,
   replaceImageSchema,
   updatePageSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import z from 'zod';

export const pagesRouter = router({
   // Returns all pages for a document with per-page transcription status for the current user
   getByDocument: publicProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ ctx, input }) => {
         const documentPages = await db
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
            .where(eq(pages.documentId, input.documentId))
            .groupBy(
               pages.id,
               pages.pageNumber,
               pages.imageUrl,
               pages.title,
               pages.createdAt,
            )
            .orderBy(asc(pages.pageNumber));

         return documentPages;
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
      .input(
         z.object({
            documentId: z.string(),
            pageNumber: z.number().int().min(1),
         }),
      )
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

         await cloudinary.uploader.destroy(page.cloudinaryPublicId);

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

         return deleted;
      }),

   addPages: protectedProcedure
      .input(addPagesSchema)
      .mutation(async ({ ctx, input }) => {
         const document = await db.query.documents.findFirst({
            where: eq(documents.id, input.documentId),
         });

         if (!document) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Document not found',
            });
         }

         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can delete documents',
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

         await cloudinary.uploader.destroy(page.cloudinaryPublicId);

         const uploaded = await cloudinary.uploader.upload(input.fileBase64, {
            folder: 'folio/documents',
            resource_type: 'image',
         });

         const [updated] = await db
            .update(pages)
            .set({
               imageUrl: uploaded.secure_url,
               cloudinaryPublicId: uploaded.public_id,
            })
            .where(eq(pages.id, input.pageId))
            .returning();

         return updated;
      }),
});
