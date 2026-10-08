import { db } from '@/db/index.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import { roleRequests } from '@/db/schema/roleRequests.js';
import { getUserStats } from '@/lib/user-stats.js';
import { protectedProcedure, router } from '@/trpc/trpc.js';
import {
   dashboardOverviewSchema,
   isContributor,
   isEditor,
} from '@folio/shared';
import { and, desc, eq, ne, sql } from 'drizzle-orm';

const RECENT_LIMIT = 5;

export const dashboardRouter = router({
   getOverview: protectedProcedure
      .output(dashboardOverviewSchema)
      .query(async ({ ctx }) => {
         const userId = ctx.user.id;
         const role = ctx.user.globalRole;
         const canContribute = isContributor(role);

         const [stats, recentDocs, rejected, queueCount, roleCount] =
            await Promise.all([
               canContribute ? getUserStats(userId) : Promise.resolve(null),

               db
                  .select({
                     id: documents.id,
                     title: documents.title,
                     status: documents.status,
                     updatedAt: documents.updatedAt,
                     pageCount: sql<number>`COUNT(${pages.id})::int`,
                     coverImageUrl: sql<
                        string | null
                     >`(array_agg(${pages.imageUrl} ORDER BY ${pages.pageNumber}))[1]`,
                  })
                  .from(documents)
                  .leftJoin(pages, eq(pages.documentId, documents.id))
                  .where(eq(documents.uploadedBy, userId))
                  .groupBy(documents.id)
                  .orderBy(desc(documents.updatedAt))
                  .limit(RECENT_LIMIT),

               canContribute
                  ? db
                       .select({
                          id: transcriptions.id,
                          documentId: documents.id,
                          documentTitle: documents.title,
                          pageNumber: pages.pageNumber,
                          rejectionReason: transcriptions.rejectionReason,
                          updatedAt: transcriptions.updatedAt,
                       })
                       .from(transcriptions)
                       .innerJoin(pages, eq(pages.id, transcriptions.pageId))
                       .innerJoin(documents, eq(documents.id, pages.documentId))
                       .where(
                          and(
                             eq(transcriptions.userId, userId),
                             eq(transcriptions.status, 'rejected'),
                          ),
                       )
                       .orderBy(desc(transcriptions.updatedAt))
                       .limit(RECENT_LIMIT)
                  : Promise.resolve([]),

               // Editors can't review their own work, so exclude it from the count
               isEditor(role)
                  ? db
                       .select({ count: sql<number>`COUNT(*)::int` })
                       .from(transcriptions)
                       .where(
                          and(
                             eq(transcriptions.status, 'submitted'),
                             ne(transcriptions.userId, userId),
                          ),
                       )
                  : Promise.resolve(null),

               role === 'admin'
                  ? db
                       .select({ count: sql<number>`COUNT(*)::int` })
                       .from(roleRequests)
                       .where(eq(roleRequests.status, 'pending'))
                  : Promise.resolve(null),
            ]);

         return {
            stats,
            recentDocuments: recentDocs.map((d) => ({
               ...d,
               updatedAt: d.updatedAt.toISOString(),
            })),
            rejectedTranscriptions: rejected.map((r) => ({
               ...r,
               updatedAt: r.updatedAt.toISOString(),
            })),
            reviewQueueCount: queueCount ? (queueCount[0]?.count ?? 0) : null,
            pendingRoleRequestCount: roleCount
               ? (roleCount[0]?.count ?? 0)
               : null,
         };
      }),
});
