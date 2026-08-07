import { router } from './trpc.js';
import { adminRouter } from './routers/admin.js';
import { documentsRouter } from './routers/documents.js';
import { transcriptionsRouter } from '@/trpc/routers/transcriptions.js';

// API endpoints
export const appRouter = router({
   admin: adminRouter,
   documents: documentsRouter,
   transcriptions: transcriptionsRouter,
});

// This line ensures type safety across client and server, and it is this AppRouter type that we'll use in client
export type AppRouter = typeof appRouter;
