import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { versions } from '@/db/schema/versions.js';
import { publicProcedure, router } from '@/trpc/trpc.js';
import { listVersionsSchema } from '@folio/shared';
import { asc, desc, eq } from 'drizzle-orm';
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
});
