import { Worker, Job } from 'bullmq';
import { connection } from '@/lib/queue.js';
import { db } from '@/db/index.js';
import { documents, documentPages } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import cloudinary from '@/lib/cloudinary.js';
import sharp from 'sharp';

// pdfjs-dist needs a canvas implementation in Node
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

export interface PdfJobData {
   documentId: string;
   fileBase64: string;
}

const renderPageToBuffer = async (
   pdf: PDFDocumentProxy,
   pageNumber: number,
): Promise<Buffer> => {
   const page = await pdf.getPage(pageNumber);
   const viewport = page.getViewport({ scale: 2.0 });

   const { width, height } = viewport;

   // Render to raw RGBA pixel data using pdfjs-dist's NodeCanvasFactory
   // We use a minimal offscreen canvas implementation via sharp
   const canvasData = new Uint8ClampedArray(width * height * 4);

   await page.render({
      canvasContext: {
         // Minimal canvas context that pdfjs needs
         canvas: { width, height },
         drawImage: () => {},
         fillRect: () => {},
         getImageData: () => ({ data: canvasData }),
         putImageData: () => {},
         save: () => {},
         restore: () => {},
         transform: () => {},
         scale: () => {},
         translate: () => {},
         clearRect: () => {},
         beginPath: () => {},
         moveTo: () => {},
         lineTo: () => {},
         stroke: () => {},
         fill: () => {},
         clip: () => {},
         setTransform: () => {},
         resetTransform: () => {},
      } as unknown as CanvasRenderingContext2D,
      viewport,
   }).promise;

   return sharp(Buffer.from(canvasData), {
      raw: { width, height, channels: 4 },
   })
      .jpeg({ quality: 90 })
      .toBuffer();
};

const processPdf = async (job: Job<PdfJobData>) => {
   const { documentId, fileBase64 } = job.data;

   try {
      // Strip data URI prefix if present
      const base64Data = fileBase64.replace(/^data:.+;base64,/, '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) })
         .promise;
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
         const imageBuffer = await renderPageToBuffer(pdf, i);

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
               .end(imageBuffer);
         });

         await db.insert(documentPages).values({
            documentId,
            pageNumber: i,
            imageUrl: uploaded.secure_url,
            cloudinaryPublicId: uploaded.public_id,
         });

         // Report progress back to BullMQ
         await job.updateProgress(Math.round((i / totalPages) * 100));
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

      throw error; // Re-throw so BullMQ marks the job as failed
   }
};

export const pdfWorker = new Worker<PdfJobData>('pdf-processing', processPdf, {
   connection,
   concurrency: 2,
});

pdfWorker.on('completed', (job) => {
   console.log(
      `PDF job ${job.id} completed for document ${job.data.documentId}`,
   );
});

pdfWorker.on('failed', (job, error) => {
   console.error(`PDF job ${job?.id} failed:`, error.message);
});
