import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { documents, pages, transcriptions } from '@/db/schema/index.js';
import cloudinary from '@/lib/cloudinary.js';

const CLOUDINARY_BATCH = 100; // delete_resources limit per call

export async function deleteUserContent(userId: string) {
   // Database first, in one transaction. If it fails, nothing is touched.
   const publicIds = await db.transaction(async (tx) => {
      const rows = await tx
         .select({ publicId: pages.cloudinaryPublicId })
         .from(pages)
         .innerJoin(documents, eq(pages.documentId, documents.id))
         .where(eq(documents.uploadedBy, userId));

      // Non-approved work on other people's documents: nobody depends on it
      await tx
         .delete(transcriptions)
         .where(
            and(
               eq(transcriptions.userId, userId),
               ne(transcriptions.status, 'approved'),
            ),
         );

      // Cascades to pages, their transcriptions and revisions.
      // Approved transcriptions on others' documents stay (userId -> NULL via FK).
      await tx.delete(documents).where(eq(documents.uploadedBy, userId));

      // TODO: collections. See notes below.

      return rows.map((r) => r.publicId);
   });

   // Cloudinary after commit. Failures leave orphaned files, never a broken account.
   const results: PromiseSettledResult<unknown>[] = [];
   for (let i = 0; i < publicIds.length; i += CLOUDINARY_BATCH) {
      results.push(
         ...(await Promise.allSettled([
            cloudinary.api.delete_resources(
               publicIds.slice(i, i + CLOUDINARY_BATCH),
            ),
         ])),
      );
   }
   results.push(
      ...(await Promise.allSettled([
         cloudinary.uploader.destroy(`avatars/${userId}`, { invalidate: true }),
      ])),
   );

   for (const r of results) {
      if (r.status === 'rejected') {
         console.error('Cloudinary cleanup failed:', r.reason);
      }
   }
}
