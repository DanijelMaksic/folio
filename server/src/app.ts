import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './trpc/context.js';
import { appRouter } from './trpc/router.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const app = express();

app.set('trust proxy', 1);

// UptimeRobot / Render health check: touches nothing (no DB, no Redis)
app.get('/api/health', (_req, res) => {
   res.status(200).send('ok');
});

app.use(helmet());

// Rate limiting
const trpcLimiter = rateLimit({
   windowMs: 60_000,
   limit: 120,
   standardHeaders: 'draft-7',
   legacyHeaders: false,
});

// Enable CORS
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Better Auth -- must be before express.json()
app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(express.json({ limit: '10mb' }));

// tRPC
app.use(
   '/api/trpc',
   trpcLimiter,
   createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error }) {
         console.log('tRPC error', error);
      },
   }),
);
