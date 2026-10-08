import { db } from '@/db/index.js';
import { documents } from '@/db/schema/documents.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import { eq, sql } from 'drizzle-orm';
import type { ContributionStats } from '@folio/shared';

export async function getUserStats(userId: string): Promise<ContributionStats> {
   const [[docs], [tr]] = await Promise.all([
      db
         .select({ count: sql<number>`COUNT(*)::int` })
         .from(documents)
         .where(eq(documents.uploadedBy, userId)),
      db
         .select({
            total: sql<number>`COUNT(*)::int`,
            approved: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'approved' THEN 1 END)::int`,
            submitted: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'submitted' THEN 1 END)::int`,
            rejected: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'rejected' THEN 1 END)::int`,
            drafts: sql<number>`COUNT(CASE WHEN ${transcriptions.status} = 'draft' THEN 1 END)::int`,
         })
         .from(transcriptions)
         .where(eq(transcriptions.userId, userId)),
   ]);

   return {
      documentsUploaded: docs?.count ?? 0,
      totalTranscriptions: tr?.total ?? 0,
      approved: tr?.approved ?? 0,
      submitted: tr?.submitted ?? 0,
      rejected: tr?.rejected ?? 0,
      drafts: tr?.drafts ?? 0,
   };
}
