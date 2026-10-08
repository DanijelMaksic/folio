import { test as base, expect, Page } from '@playwright/test';
import { seedUser, cleanupUser, type Role } from './global-setup.js';

interface AuthFixture {
   email: string;
   password: string;
   username: string;
}

async function login(page: Page, email: string, password: string) {
   await page.goto('/login');
   await page.getByLabel('Email').fill(email);
   await page.getByLabel('Password').fill(password);
   await page.getByRole('button', { name: 'Sign in' }).click();
   await page.waitForURL('/dashboard');
}

export const test = base.extend<{
   auth: AuthFixture;
   loginAs: (role: Role) => Promise<AuthFixture>;
}>({
   auth: async ({ page }, use) => {
      const tag = Date.now();
      const email = `e2e+${tag}@example.com`;
      const password = 'Password123!';
      const username = `e2euser${tag}`;

      await seedUser(
         { email, password, username, name: `E2E User ${tag}` },
         'contributor',
      );
      await login(page, email, password);

      await use({ email, password, username });

      await cleanupUser(email);
   },

   // Seeds a user with the given role, logs in, and cleans up after the test
   loginAs: async ({ page }, use) => {
      const emails: string[] = [];

      await use(async (role) => {
         const tag = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
         const creds = {
            email: `e2e+${role}${tag}@example.com`,
            password: 'Password123!',
            username: `e2e${role}${tag}`,
         };
         emails.push(creds.email);

         await seedUser({ ...creds, name: `E2E ${role} ${tag}` }, role);
         await login(page, creds.email, creds.password);
         return creds;
      });

      for (const email of emails) await cleanupUser(email);
   },
});

export { expect } from '@playwright/test';
