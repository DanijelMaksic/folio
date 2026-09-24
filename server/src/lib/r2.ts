import {
   S3Client,
   PutObjectCommand,
   GetObjectCommand,
   DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const r2 = new S3Client({
   region: 'auto',
   endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
   credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
   },
});

export const uploadToR2 = async (
   key: string,
   base64: string,
): Promise<void> => {
   // Strip data URI prefix if present (e.g. "data:application/pdf;base64,")
   const base64Data = base64.replace(/^data:.+;base64,/, '');
   const buffer = Buffer.from(base64Data, 'base64');

   await r2.send(
      new PutObjectCommand({
         Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
         Key: key,
         Body: buffer,
         ContentType: 'application/pdf',
      }),
   );
};

export const getFromR2 = async (key: string): Promise<Buffer> => {
   const response = await r2.send(
      new GetObjectCommand({
         Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
         Key: key,
      }),
   );

   const chunks: Uint8Array[] = [];
   for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
   }

   return Buffer.concat(chunks);
};

export const deleteFromR2 = async (key: string): Promise<void> => {
   await r2.send(
      new DeleteObjectCommand({
         Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
         Key: key,
      }),
   );
};

export default r2;
