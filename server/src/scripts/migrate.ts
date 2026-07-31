import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

async function runMigration() {
   const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
   });

   try {
      await client.connect();
      const db = drizzle(client);

      console.log('🚀 Running migrations...');
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('✅ Migrations complete.');
   } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
   } finally {
      await client.end();
   }
}

runMigration();
