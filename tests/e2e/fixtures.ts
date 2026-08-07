import { test as base } from '@playwright/test';

const testUser = {
   email: 'test_e2e_docs@example.com',
   password: 'Password123!',
   username: 'e2edocs',
   name: 'E2E Docs user',
};

export const test = base.extend({
   page: async ({ page }, use) => {
      // Login before each test
      await page.goto('/login');
      await page.getByLabel('Email').fill(testUser.email);
      await page.getByLabel('Password').fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('/');

      await use(page);
   },
});

export { expect } from '@playwright/test';
