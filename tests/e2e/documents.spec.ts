import { test, expect } from './fixtures.js';
import { cleanupUser } from './globalSetup.js';

const testUser = {
   email: 'test_e2e_docs@example.com',
   password: 'Password123!!',
   username: 'e2eDocs',
   name: 'E2E Docs user',
};

const docTitle = 'E2E Test Document';

test.afterAll(async () => {
   await cleanupUser(testUser.email);
});

test.describe('Document upload flow', () => {
   test('contributor can upload a document and see it in the list', async ({
      page,
   }) => {
      // page is already logged in via fixture
      await page.goto('/documents/upload');

      await page.getByLabel('Title').fill(docTitle);
      await page.getByLabel('Description').fill('Uploaded by Playwright');

      await page.getByLabel('File').setInputFiles({
         name: 'test.png',
         mimeType: 'image/png',
         buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
         ),
      });

      await page.getByRole('button', { name: 'Upload' }).click();

      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText(docTitle)).toBeVisible();

      await page.goto('/documents');
      await expect(page.getByText(docTitle)).toBeVisible();

      await page.getByText(docTitle).click();
      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText(docTitle)).toBeVisible({ timeout: 15_000 });
   });
});
