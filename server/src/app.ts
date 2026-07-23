import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './trpc/context.js';
import { appRouter } from './trpc/router.js';

export const app = express();

// Enable CORS
app.use(
   cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
   }),
);

// Better Auth -- must be before express.json()
app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json());

// tRPC
app.use(
   '/api/trpc',
   createExpressMiddleware({
      router: appRouter,
      createContext,
   }),
);
