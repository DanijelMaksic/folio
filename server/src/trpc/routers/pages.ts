import { db } from '@/db/index.js';
import { pages } from '@/db/schema/pages.js';
import { publicProcedure, router } from '@/trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { and, asc, eq, sql } from 'drizzle-orm';
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
               createdAt: pages.createdAt,
               // Overall page status — approved if any transcription is approved
               approvedTranscriptionCount: sql<number>`(
               SELECT COUNT(*) FROM transcriptions
               WHERE page_id = ${pages.id}
               AND status = 'approved'
            )`,
            })
            .from(pages)
            .where(eq(pages.documentId, input.documentId))
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
});
