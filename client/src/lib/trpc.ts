import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@server/trpc/router.js'; // tHe contract, defining what endpoints exist and their input/output shapes.
import { httpBatchLink } from '@trpc/client';

// Ensures that React Query hooks are typed with AppRouter type
export const trpc = createTRPCReact<AppRouter>();

// rRPC HTTP transport layer
export const trpcClient = trpc.createClient({
   links: [
      httpBatchLink({
         // Batches HTTP requests
         url: `${import.meta.env.VITE_API_URL}/api/trpc`,
      }),
   ],
});
