import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema/index.js';

const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
   max: 10,
   connectionTimeoutMillis: 10_000, // cold Neon compute must not hang forever
});

// An unhandled 'error' on an idle client would crash the process
pool.on('error', (err) => console.error('Postgres pool error:', err.message));

export const db = drizzle(pool, { schema, casing: 'snake_case' });
