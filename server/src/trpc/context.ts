import { db } from '@/db/index.js'; // drizzle instance
import { auth } from '@/lib/auth.js'; // better-auth server instance
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'; // tRPC type from Express adapter

// Runs on every tRPC request, builds ctx object for prodecures to use
export const createContext = async ({
   req,
   res,
}: CreateExpressContextOptions) => {
   const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
   });

   return {
      req,
      res,
      db,
      user: session?.user ?? null,
      session: session?.session ?? null,
   };
};

// Deriving type from the createContext fn, so every procedure gets full autocomplete and type-checking on ctx.user, ctx.db, etc.
export type Context = Awaited<ReturnType<typeof createContext>>;
