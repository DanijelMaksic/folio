import { router } from '@/trpc/trpc.js';
import { adminRouter } from '@/trpc/routers/admin.js';
import { pagesRouter } from '@/trpc/routers/pages.js';
import { documentsRouter } from '@/trpc/routers/documents.js';
import { collectionsRouter } from '@/trpc/routers/collections.js';
import { transcriptionsRouter } from '@/trpc/routers/transcriptions.js';
import { profileRouter } from '@/trpc/routers/profile.js';
import { dashboardRouter } from '@/trpc/routers/dashboard.js';

// API endpoints
export const appRouter = router({
   admin: adminRouter,
   documents: documentsRouter,
   transcriptions: transcriptionsRouter,
   collections: collectionsRouter,
   pages: pagesRouter,
   profile: profileRouter,
   dashboard: dashboardRouter,
});

// This line ensures type safety across client and server, and it is this AppRouter type that we'll use in client
export type AppRouter = typeof appRouter;
