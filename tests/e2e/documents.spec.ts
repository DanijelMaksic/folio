import { test, expect } from './fixtures.js';
import { cleanupCloudinaryFolder } from './global-setup.js';
import { testSearch, uploadTestDocument } from './helpers.js';

const title = 'E2E Test Document';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('folio/documents');
});

test.describe('Document upload flow', () => {
   test('contributor can upload a document and see it in the list', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await uploadTestDocument(page, title);

      await page.goto('/documents');
      await expect(page.getByText(title)).toBeVisible();

      await page.getByText(title).click();
      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
   });
});

test.describe('Documents browsing flow', () => {
   test('user can search for the document by title and see it in results', async ({
      page,
      auth,
   }) => {
      await uploadTestDocument(page, title);
      await testSearch(page, '/documents', title);
   });
});
