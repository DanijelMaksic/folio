import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { API, login, cleanupUser, headers } from './helpers.js';
import { user } from '@/db/schema/auth.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

const testUser = {
   email: 'test_docs@example.com',
   password: 'Password123!',
   username: 'vitestdocs',
   name: 'Documents Test User',
};

async function seedUser(payload: typeof testUser, role: 'contributor') {
   await fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });

   await db
      .update(user)
      .set({
         emailVerified: true,
         globalRole: role,
         twoFactorEnabled: false,
      })
      .where(eq(user.email, payload.email));
}

beforeAll(async () => {
   // Clean up any leftover test user
   cleanupUser(testUser.email);
   await seedUser(testUser, 'contributor');
});

afterAll(async () => {
   cleanupUser(testUser.email);
});

describe('documents', () => {
   it('upload succeeds and returns document', async () => {
      const loginRes = await login(testUser.email, testUser.password);
      const cookie = loginRes.headers.get('set-cookie');

      const res = await fetch(
         'http://localhost:3000/api/trpc/documents.upload',
         {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Origin: 'http://localhost:5173',
               Cookie: cookie ?? '',
            },
            body: JSON.stringify({
               title: 'Test Document',
               description: 'Test description',
               fileBase64:
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
               fileType: 'image/png',
            }),
         },
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toBeTruthy();
   });
});
