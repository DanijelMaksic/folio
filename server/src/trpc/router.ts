import { router } from '@/trpc/trpc.js';
import { adminRouter } from '@/trpc/routers/admin.js';
import { pagesRouter } from '@/trpc/routers/pages.js';
import { documentsRouter } from '@/trpc/routers/documents.js';
import { collectionsRouter } from '@/trpc/routers/collections.js';
import { transcriptionsRouter } from '@/trpc/routers/transcriptions.js';
import { dashboardRouter } from '@/trpc/routers/dashboard.js';
import { notesRouter } from '@/trpc/routers/notes.js';
import { usersRouter } from '@/trpc/routers/users.js';
import { settingsRouter } from '@/trpc/routers/settings.js';

// API endpoints
export const appRouter = router({
   admin: adminRouter,
   documents: documentsRouter,
   transcriptions: transcriptionsRouter,
   collections: collectionsRouter,
   pages: pagesRouter,
   settings: settingsRouter,
   dashboard: dashboardRouter,
   notes: notesRouter,
   users: usersRouter,
});

// This line ensures type safety across client and server, and it is this AppRouter type that we'll use in client
export type AppRouter = typeof appRouter;
