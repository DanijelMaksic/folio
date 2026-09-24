import { db } from '@/db/index.js';
import { documentPages } from '@/db/schema/document-pages.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { isEditor } from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import z from 'zod';

export const pagesRouter = router({
   // Returns all pages for a document with per-page transcription status for the current user
   getByDocument: publicProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ ctx, input }) => {
         const pages = await db
            .select({
               id: documentPages.id,
               pageNumber: documentPages.pageNumber,
               imageUrl: documentPages.imageUrl,
               createdAt: documentPages.createdAt,
               // Overall page status — approved if any transcription is approved
               approvedTranscriptionCount: sql<number>`(
               SELECT COUNT(*) FROM transcriptions
               WHERE page_id = ${documentPages.id}
               AND status = 'approved'
            )`,
            })
            .from(documentPages)
            .where(eq(documentPages.documentId, input.documentId))
            .orderBy(asc(documentPages.pageNumber));
      }),

   // Returns a single page by id
   getById: publicProcedure
      .input(z.object({ pageId: z.string() }))
      .query(async ({ ctx, input }) => {
         const [page] = await db
            .select()
            .from(documentPages)
            .where(eq(documentPages.id, input.pageId))
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
            .from(documentPages)
            .where(
               and(
                  eq(documentPages.documentId, input.documentId),
                  eq(documentPages.pageNumber, input.pageNumber),
               ),
            )
            .limit(1);

         if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

         return page;
      }),
});
