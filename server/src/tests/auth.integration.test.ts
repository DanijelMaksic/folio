import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db/index.js';
import { user } from '@/db/schema.js';
import { eq } from 'drizzle-orm';

// Tests in this file are written in ORDER, don't reshuffle them

const API = 'http://localhost:3000';

// Origin is here to enable CORS during tests
const headers = {
   'Content-Type': 'application/json',
   Origin: 'http://localhost:5173',
};

async function register(payload: Record<string, string>) {
   return fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });
}

async function login(email: string, password: string) {
   return fetch(`${API}/api/auth/sign-in/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
   });
}

const testUser = {
   email: 'test_vitest@example.com',
   password: 'Password123!',
   username: 'vitestuser',
   name: 'Vitest User',
};

beforeAll(async () => {
   // Clean up any leftover test user
   await db.delete(user).where(eq(user.email, testUser.email));
});

afterAll(async () => {
   await db.delete(user).where(eq(user.email, testUser.email));
});

describe('Registration', () => {
   it('creates a user and returns 200', async () => {
      const res = await register(testUser);
      expect(res.status).toBe(200);
   });

   it('rejects duplicate email', async () => {
      // Imperative way to test, since BetterAuth makes it hard to do this declaratively
      await register(testUser);
      const users = await db
         .select()
         .from(user)
         .where(eq(user.email, testUser.email));
      expect(users.length).toBe(1);
   });
});

describe('Login', () => {
   it('rejects login before email verification', async () => {
      const res = await login(testUser.email, testUser.password);
      // BetterAuth blocks unverified users when requireEmailVerification is set to true
      expect(res.status).toBe(403);
   });

   it('rejects wrong password', async () => {
      // Manually mark user as verified so we can isolate the password check
      await db
         .update(user)
         .set({ emailVerified: true })
         .where(eq(user.email, testUser.email));

      const res = await login(testUser.email, 'WrongPassword!');
      expect(res.status).toBe(401);
   });
});

describe('Login after manual verification', () => {
   it('succeeds and returns a session cookie', async () => {
      // User was verified in the previous test
      const res = await login(testUser.email, testUser.password);
      expect(res.status).toBe(200);

      const cookie = res.headers.get('set-cookie');
      expect(cookie).toBeTruthy();
   });
});

describe('Session', () => {
   it('returns user data with a valid session', async () => {
      // test flow: login → grab cookie → send cookie to get-session → assert user data
      const loginRes = await login(testUser.email, testUser.password);
      const cookie = loginRes.headers.get('set-cookie')!;

      // We are manually putting cookie in get-session headers, in order to simulate what browser does automatically - storing cookies between reqs
      const sessionRes = await fetch(`${API}/api/auth/get-session`, {
         headers: { cookie, Origin: 'http://localhost:5173' },
      });
      const body = await sessionRes.json();
      expect(body.user.email).toBe(testUser.email);
      expect(body.user.username).toBe(testUser.username);
      expect(body.user.globalRole).toBe('viewer');
   });

   it('returns null session after sign-out', async () => {
      // test flow: login → grab cookie → sign-out (with cookie) → get-session (with same cookie) → assert null
      const loginRes = await login(testUser.email, testUser.password);
      const cookie = loginRes.headers.get('set-cookie')!;

      await fetch(`${API}/api/auth/sign-out`, {
         method: 'POST',
         headers: { cookie, Origin: 'http://localhost:5173' },
      });

      const sessionRes = await fetch(`${API}/api/auth/get-session`, {
         headers: { cookie },
      });

      const body = await sessionRes.json();
      expect(body).toBeNull();
   });
});
