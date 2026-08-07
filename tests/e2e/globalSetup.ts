import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('../server/.env') });

import { user } from '../../server/src/db/schema.js';
import { db } from '../../server/src/db/index.js';
import { eq } from 'drizzle-orm';

const API = 'http://localhost:3000';

const headers = {
   'Content-Type': 'application/json',
   Origin: 'http://localhost:5173',
};

export type Role = 'viewer' | 'contributor' | 'editor' | 'admin';

export interface UserPayload {
   email: string;
   password: string;
   username: string;
   name: string;
}

export async function seedUser(payload: UserPayload, role: Role) {
   await fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });

   await db
      .update(user)
      .set({ emailVerified: true, globalRole: role, twoFactorEnabled: false })
      .where(eq(user.email, payload.email));
}

export async function cleanupUser(email: string) {
   await db.delete(user).where(eq(user.email, email));
}

export default async function globalSetup() {
   await seedUser(
      {
         email: 'test_e2e_docs@example.com',
         password: 'Password123!',
         username: 'e2edocs',
         name: 'E2E Docs user',
      },
      'contributor',
   );
}
