import { db } from '@/db/index.js';
import { twoFactor, user } from '@/db/schema.js';
import { admin } from 'better-auth/plugins';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const API = 'http://localhost:3000';

// Origin is here to enable CORS during tests
const headers = {
   'Content-Type': 'application/json',
   Origin: 'http://localhost:5173',
};

async function login(email: string, password: string) {
   return fetch(`${API}/api/auth/sign-in/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
   });
}

const adminUser = {
   email: 'test_2fa_admin@example.com',
   password: 'Password123!',
   username: 'vitest2faadmin',
   name: '2FA Admin',
};

const viewerUser = {
   email: 'test_2fa_viewer@example.com',
   password: 'Password123!',
   username: 'vitest2faviewer',
   name: '2FA Viewer',
};

async function seedUser(
   payload: typeof adminUser,
   role: 'viewer' | 'admin',
   withTwoFactor: boolean,
) {
   await fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });

   // Marks user as email-verified (to bypass email flow)
   const updates: Record<string, unknown> = {
      emailVerified: true,
      globalRole: role,
   };
   if (withTwoFactor) updates.twoFactorEnabled = true;

   await db.update(user).set(updates).where(eq(user.email, payload.email));

   if (withTwoFactor) {
      const target = await db
         .select()
         .from(user)
         .where(eq(user.email, payload.email))
         .then((rows) => rows[0]);

      await db.insert(twoFactor).values({
         id: randomBytes(16).toString('hex'),
         userId: target.id,
         secret: randomBytes(32).toString('hex'),
         backupCodes: JSON.stringify([]),
         verified: true,
      });
   }
}

beforeAll(async () => {
   await db.delete(user).where(eq(user.email, adminUser.email));
   await db.delete(user).where(eq(user.email, viewerUser.email));
   await seedUser(adminUser, 'admin', true);
   await seedUser(viewerUser, 'viewer', false);
});

afterAll(async () => {
   await db.delete(user).where(eq(user.email, adminUser.email));
   await db.delete(user).where(eq(user.email, viewerUser.email));
});

describe('2FA — elevated roles', () => {
   it('returns twoFactorRedirect for admin login', async () => {
      const res = await login(adminUser.email, adminUser.password);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.twoFactorRedirect).toBe(true);
   });
});

describe('2FA — viewer role', () => {
   it('does not trigger 2FA for viewer login', async () => {
      const res = await login(viewerUser.email, viewerUser.password);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.twoFactorRedirect).toBeUndefined();
   });

   it('returns a session cookie immediately for viewer', async () => {
      const res = await login(viewerUser.email, viewerUser.password);
      expect(res.status).toBe(200);
      const cookie = res.headers.get('set-cookie');
      expect(cookie).toContain('better-auth.session_token');
   });
});

describe('2FA — OTP verification', () => {
   it('rejects an invalid OTP code', async () => {
      const loginRes = await login(adminUser.email, adminUser.password);
      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers.get('set-cookie')!;

      const res = await fetch(`${API}/api/auth/two-factor/verify-otp`, {
         method: 'POST',
         headers: { ...headers, cookie },
         body: JSON.stringify({ code: '000000' }),
      });
      expect(res.status).toBe(401);
   });

   it('rejects OTP verification without a challenge cookie', async () => {
      const res = await fetch(`${API}/api/auth/two-factor/verify-otp`, {
         method: 'POST',
         headers,
         body: JSON.stringify({ code: '000000' }),
      });
      expect(res.status).toBe(401);
   });
});
