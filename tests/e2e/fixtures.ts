import { test as base, expect, Page, TestInfo } from '@playwright/test';
import { seedUser, cleanupUser } from './global-setup.js';

interface AuthFixture {
   email: string;
   password: string;
   username: string;
}

export const test = base.extend<{ auth: AuthFixture }>({
   auth: async ({ page }, use, testInfo) => {
      const tag = Date.now();
      const email = `e2e+${tag}@example.com`;
      const password = 'Password123!';
      const username = `e2euser${tag}`;

      await seedUser(
         { email, password, username, name: `E2E User ${tag}` },
         'contributor',
      );

      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('/documents');

      await use({ email, password, username });

      await cleanupUser(email);
   },
});

export { expect } from '@playwright/test';
