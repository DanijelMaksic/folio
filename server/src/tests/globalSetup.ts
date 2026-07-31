import * as dotenv from 'dotenv';
import * as path from 'path';
import { createServer } from 'http';
import type { Server } from 'http';
import { execSync } from 'node:child_process';

// Vitest global setup, runs once before and after the entire test suite, not before/after individual tests

// Environment detection pattern, it checks whether DATABASE_URL is already set before trying to load a .env file
if (!process.env.DATABASE_URL) {
   dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
   // Now devs can run tests locally without manual setup
}

let server: Server;

export async function setup() {
   // Starts docker postgres container
   if (!process.env.CI) {
      execSync('docker compose up -d', { stdio: 'inherit' });

      // Wait for postgres to be ready
      const maxRetries = 20;
      for (let i = 0; i < maxRetries; i++) {
         try {
            execSync('docker compose exec -T postgres pg_isready -U postgres', {
               stdio: 'pipe',
            });
            break;
         } catch {
            if (i === maxRetries - 1)
               throw new Error('Postgres did not become ready in time');
            await new Promise((resolve) => setTimeout(resolve, 500));
         }
      }
   }

   const { app } = await import('../app.js');

   await new Promise<void>((resolve) => {
      server = createServer(app).listen(3000, resolve);
   });
}

export async function teardown() {
   await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
   });
}
