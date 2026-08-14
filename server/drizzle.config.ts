import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
   schema: './src/db/schema/index.ts',
   out: './migrations',
   dialect: 'postgresql',
   casing: 'snake_case',
   dbCredentials: {
      url: process.env.DATABASE_URL!,
   },
} satisfies Config;
