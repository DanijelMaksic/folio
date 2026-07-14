import type { Config } from 'drizzle-kit';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default {
   schema: './src/db/schema.ts',
   out: './migrations',
   dialect: 'postgresql',
   dbCredentials: {
      url: process.env.DATABASE_URL!,
   },
} satisfies Config;
