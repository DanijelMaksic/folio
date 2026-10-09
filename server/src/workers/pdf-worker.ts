import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/queue.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary.js';
import { documents } from '@/db/schema/documents.js';
import { pages } from '@/db/schema/pages.js';
import { pdf } from 'pdf-to-img';

export interface PdfJobData {
   documentId: string;
   fileBase64: string;
}

const processPdf = async (job: Job<PdfJobData>) => {
   const { documentId, fileBase64 } = job.data;

   try {
      const doc = await pdf(fileBase64, { scale: 2 });
      const totalPages = doc.length;
      let i = 1;

      for await (const pageImage of doc) {
         const uploaded = await new Promise<{
            secure_url: string;
            public_id: string;
         }>((resolve, reject) => {
            cloudinary.uploader
               .upload_stream(
                  { folder: 'folio/documents', resource_type: 'image' },
                  (error, result) => {
                     if (error || !result) return reject(error);
                     resolve(result);
                  },
               )
               .end(pageImage);
         });

         await db.insert(pages).values({
            documentId,
            title: `Page ${i}`,
            pageNumber: i,
            imageUrl: uploaded.secure_url,
            cloudinaryPublicId: uploaded.public_id,
         });

         await job.updateProgress(Math.round((i / totalPages) * 100));
         i++;
      }

      await db
         .update(documents)
         .set({ status: 'ready', updatedAt: new Date() })
         .where(eq(documents.id, documentId));
   } catch (error) {
      await db
         .update(documents)
         .set({ status: 'failed', updatedAt: new Date() })
         .where(eq(documents.id, documentId));

      throw error;
   }
};

export const pdfWorker = new Worker<PdfJobData>('pdf-processing', processPdf, {
   connection,
   concurrency: 1,
   drainDelay: 30,
   stalledInterval: 5 * 60 * 1000,
});

pdfWorker.on('completed', (job) => {
   console.log(
      `PDF job ${job.id} completed for document ${job.data.documentId}`,
   );
});

pdfWorker.on('failed', (job, error) => {
   console.error(`PDF job ${job?.id} failed:`, error.message);
});
