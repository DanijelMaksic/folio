import 'dotenv/config';
import express from 'express';
import { sql } from 'drizzle-orm';
import { db } from './db';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.get('/api/health', async (_req, res) => {
   await db.execute(sql`SELECT 1`);
   res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
