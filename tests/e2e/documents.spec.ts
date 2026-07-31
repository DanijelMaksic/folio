import { test, expect } from 'playwright/test';
import { cleanupUser, seedUser, headers, API } from './helpers.js';

const testUser = {
   email: 'test_e2e_docs@example.com',
   password: 'Password123!',
   username: 'e2edocs',
   name: 'E2E Docs user',
};

const docTitle = 'E2E Test Document';

test.beforeAll(async () => {
   try {
      await cleanupUser(testUser.email);
      await seedUser(testUser, 'contributor');

      // Verify user exists
      const res = await fetch(`${API}/api/auth/sign-in/email`, {
         method: 'POST',
         headers,
         body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
         }),
      });
      console.log('seed login test status:', res.status);
      console.log('seed login test body:', await res.json());
      console.log('Setup complete');
   } catch (err) {
      console.error('beforeAll failed:', err);
      throw err;
   }
});

test.afterAll(async () => {
   await cleanupUser(testUser.email);
});

test('contributor can upload a document and see it in the list', async ({
   page,
}) => {
   await page.goto('/login');
   await page.getByLabel('Email').fill(testUser.email);
   await page.getByLabel('Password').fill(testUser.password);
   await page.getByRole('button', { name: 'Sign in' }).click();
   await page.waitForURL('/');

   // Go to upload page
   await page.goto('/documents/upload');

   // Fill in the form
   await page.getByLabel('Title').fill(docTitle);
   await page.getByLabel('Description').fill('Uploaded by Playwright');

   // Upload a small test image
   await page.getByLabel('File').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
         'base64',
      ),
   });

   await page.getByRole('button', { name: 'Upload' }).click();

   // Should redirect to document detail page
   await page.waitForURL(/\/documents\/.+/);
   await expect(page.getByText(docTitle)).toBeVisible();

   // Go to documents list and verify it appears
   await page.goto('/documents');
   await expect(page.getByText(docTitle)).toBeVisible();

   // Click through to detail page
   await page.getByText(docTitle).click();
   await page.waitForURL(/\/documents\/.+/);
   await expect(page.getByText(docTitle)).toBeVisible();
});
