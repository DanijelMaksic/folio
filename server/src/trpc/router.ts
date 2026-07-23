import { router } from './trpc.js';
import { adminRouter } from './routers/admin.js';

// API endpoints
export const appRouter = router({
   admin: adminRouter,
});

// This line ensures type safety across client and server, and it is this AppRouter type that we'll use in client
export type AppRouter = typeof appRouter;
