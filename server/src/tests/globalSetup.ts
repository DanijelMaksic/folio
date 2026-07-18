import * as dotenv from 'dotenv';
import * as path from 'path';
import { createServer } from 'http';
import type { Server } from 'http';

// Vitest global setup, runs once before and after the entire test suite, not before/after individual tests

// Environment detection pattern, it checks whether DATABASE_URL is already set before trying to load a .env file
if (!process.env.DATABASE_URL) {
   dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
   // Now devs can run tests locally without manual setup
}

let server: Server;

export async function setup() {
   const { app } = await import('../index.js');

   await new Promise<void>((resolve) => {
      server = createServer(app).listen(3000, resolve);
   });
}

export async function teardown() {
   await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
   });
}
