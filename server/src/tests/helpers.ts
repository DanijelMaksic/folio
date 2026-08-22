import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { eq } from 'drizzle-orm';

export const API = 'http://localhost:3000';

// Origin is here to enable CORS during tests
export const headers = {
   'Content-Type': 'application/json',
   Origin: 'http://localhost:5173',
};

export async function register(payload: Record<string, string>) {
   return fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });
}

export async function login(email: string, password: string) {
   return fetch(`${API}/api/auth/sign-in/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
   });
}

export async function cleanupUser(email: string) {
   await db.delete(user).where(eq(user.email, email));
}
