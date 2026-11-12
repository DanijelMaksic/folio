import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { versions } from '@/db/schema/versions.js';
import { documentVisibility } from '@/lib/document-visibility.js';
import { publicProcedure, router } from '@/trpc/trpc.js';
import { listUserVersionsSchema, listVersionsSchema } from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const author = alias(user, 'author');
const approver = alias(user, 'approver');

export const versionsRouter = router({
   listByPage: publicProcedure
      .input(listVersionsSchema)
      .query(async ({ ctx, input }) => {
         const orderBy = {
            newest: [desc(versions.approvedAt), desc(versions.id)],
            oldest: [asc(versions.approvedAt), asc(versions.id)],
         }[input.sort];

         const results = await db
            .select({
               id: versions.id,
               pageId: versions.pageId,
               transcriptionId: versions.transcriptionId,
               content: versions.content,
               isBlank: versions.isBlank,
               userId: versions.userId,
               approvedAt: versions.approvedAt,
               authorUsername: author.username,
               authorName: author.name,
               authorImage: author.image,
               approverUsername: approver.username,
               approverName: approver.name,
               approverImage: approver.image,
            })
            .from(versions)
            .leftJoin(author, eq(author.id, versions.userId))
            .leftJoin(approver, eq(approver.id, versions.approvedBy))
            .where(eq(versions.pageId, input.pageId))
            .limit(input.limit)
            .orderBy(...orderBy);

         return results;
      }),

   listByUser: publicProcedure
      .input(listUserVersionsSchema)
      .query(async ({ ctx, input }) => {
         const { userId, page, limit, sort } = input;

         if (!userId)
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: "This user doesn't exist",
            });

         const order =
            sort === 'newest'
               ? desc(versions.approvedAt)
               : asc(versions.approvedAt);

         const where = and(
            eq(versions.userId, userId),
            documentVisibility(ctx.user),
         );

         const tiebreak =
            sort === 'newest' ? desc(versions.id) : asc(versions.id);

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: versions.id,
                  pageId: versions.pageId,
                  content: versions.content,
                  isBlank: versions.isBlank,
                  approvedAt: versions.approvedAt,
                  approverUsername: user.username,
                  documentId: documents.id,
                  documentTitle: documents.title,
                  pageTitle: pages.title,
                  pageNumber: pages.pageNumber,
               })
               .from(versions)
               .leftJoin(user, eq(user.id, versions.approvedBy))
               .innerJoin(pages, eq(pages.id, versions.pageId))
               .innerJoin(documents, eq(documents.id, pages.documentId))
               .where(where)
               .orderBy(order, tiebreak)
               .limit(input.limit)
               .offset((page - 1) * limit),

            db
               .select({ total: count() })
               .from(versions)
               .innerJoin(pages, eq(pages.id, versions.pageId))
               .innerJoin(documents, eq(documents.id, pages.documentId))
               .where(where),
         ]);

         return {
            versions: results,
            totalCount: total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
         };
      }),
});
