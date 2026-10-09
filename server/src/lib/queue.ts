import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const connection = new Redis(process.env.REDIS_URL!, {
   maxRetriesPerRequest: null,
});

connection.on('error', (err) => console.error('Redis error:', err.message));

export const pdfQueue = new Queue('pdf-processing', {
   connection,
   defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: { count: 5 }, // failed jobs keep their base64 payload
   },
});
