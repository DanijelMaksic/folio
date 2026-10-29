import { db } from '@/db/index.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { eq, sql, count, and } from 'drizzle-orm';

export const submittedExists = sql`EXISTS (
  SELECT 1 FROM transcriptions t
  WHERE t.page_id = ${pages.id} AND t.status = 'submitted'
)`;

export const approvedExists = sql`EXISTS (
  SELECT 1 FROM transcriptions t
  WHERE t.page_id = ${pages.id} AND t.status = 'approved'
)`;

export async function getDocumentProgress(documentId: string) {
   const [row] = await db
      .select({
         totalPages: count(),
         transcribedPages:
            sql<number>`count(*) filter (where ${approvedExists})`.mapWith(
               Number,
            ),
         // waiting for review, with no approved transcription yet
         submittedPages:
            sql<number>`count(*) filter (where ${submittedExists} and not ${approvedExists})`.mapWith(
               Number,
            ),
         contributors: sql<number>`(
            SELECT COUNT(DISTINCT t.user_id) FROM transcriptions t
            JOIN document_pages p ON p.id = t.page_id
            WHERE p.document_id = ${documentId} AND t.status = 'approved'
         )`.mapWith(Number),
      })
      .from(pages)
      .where(eq(pages.documentId, documentId));

   const totalPages = row?.totalPages ?? 0;
   const transcribedPages = row?.transcribedPages ?? 0;
   const submittedPages = row?.submittedPages ?? 0;

   return {
      totalPages,
      transcribedPages,
      submittedPages,
      notStartedPages: totalPages - transcribedPages - submittedPages,
      contributors: row?.contributors ?? 0,
      percent:
         totalPages === 0
            ? 0
            : Math.floor((transcribedPages / totalPages) * 100),
   };
}

export async function getCollectionProgress(collectionId: string) {
   const [row] = await db
      .select({
         totalPages: count(pages.id),
         transcribedPages:
            sql<number>`count(*) filter (where ${approvedExists})`.mapWith(
               Number,
            ),
         submittedPages:
            sql<number>`count(*) filter (where ${submittedExists} and not ${approvedExists})`.mapWith(
               Number,
            ),
         contributors: sql<number>`(
            SELECT COUNT(DISTINCT t.user_id) FROM transcriptions t
            JOIN document_pages p ON p.id = t.page_id
            JOIN documents d ON d.id = p.document_id
            WHERE d.collection_id = ${collectionId}
              AND d.status = 'ready' AND t.status = 'approved'
         )`.mapWith(Number),
         totalDocuments: sql<number>`(
            SELECT COUNT(*) FROM documents
            WHERE collection_id = ${collectionId} AND status = 'ready'
         )`.mapWith(Number),
      })
      .from(pages)
      .innerJoin(documents, eq(documents.id, pages.documentId))
      .where(
         and(
            eq(documents.collectionId, collectionId),
            eq(documents.status, 'ready'),
         ),
      );

   const totalPages = row?.totalPages ?? 0;
   const transcribedPages = row?.transcribedPages ?? 0;
   const submittedPages = row?.submittedPages ?? 0;

   return {
      totalDocuments: row?.totalDocuments ?? 0,
      totalPages,
      transcribedPages,
      submittedPages,
      notStartedPages: totalPages - transcribedPages - submittedPages,
      contributors: row?.contributors ?? 0,
      percent:
         totalPages === 0
            ? 0
            : Math.floor((transcribedPages / totalPages) * 100),
   };
}
