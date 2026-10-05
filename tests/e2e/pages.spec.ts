import { test, expect } from './fixtures.js';
import { cleanupCloudinaryFolder } from './global-setup.js';
import { uploadTestDocument } from './helpers.js';

const title = 'E2E Test Document';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('folio/documents');
});

test.describe('Page CRUD operations', () => {
   test('contributor can upload a document and see its pages', async ({
      page,
      auth,
   }) => {
      await uploadTestDocument(page, title);
      await expect(page.getByText('Page 1')).toBeVisible({ timeout: 15_000 });
   });

   test('contributor can edit a page title', async ({ page, auth }) => {
      await uploadTestDocument(page, title);

      // Click the page card to go to the page details
      await page.getByText('Page 1').click();
      await page.waitForURL(/\/documents\/.+\/pages\/.+/);

      await page.getByTestId('actions-dropdown-btn').click();
      await expect(page.getByText('Edit')).toBeVisible();

      await page.getByTestId('edit-modal-btn').click();
      await expect(page.getByText('Edit Page')).toBeVisible();

      const titleInput = page.getByLabel('Title');
      await expect(titleInput).toHaveValue('Page 1');
      await titleInput.fill('Edited Page Title');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Edited Page Title')).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can delete a page', async ({ page, auth }) => {
      await uploadTestDocument(page, title);

      await page.getByText('Page 1').click();
      await page.waitForURL(/\/documents\/.+\/pages\/.+/);

      await page.getByTestId('actions-dropdown-btn').click();
      await expect(page.getByText('Delete')).toBeVisible();

      await page.getByTestId('delete-modal-btn').click();
      await expect(page.getByText('Delete Page')).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText('Page 1')).not.toBeVisible();
   });

   test('contributor can change the page image', async ({ page, auth }) => {
      await uploadTestDocument(page, title);

      await page.getByText('Page 1').click();
      await page.waitForURL(/\/documents\/.+\/pages\/.+/);

      await page.getByRole('button', { name: 'Change Image' }).click();
      await expect(page.getByText('Change Page Image')).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles({
         name: 'replacement.png',
         mimeType: 'image/png',
         buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
         ),
      });

      await expect(page.getByText('replacement.png')).toBeVisible();
      await page.getByTestId('change-img-btn').click();
      await expect(page.getByText('Change Page Image')).not.toBeVisible({
         timeout: 15_000,
      });
   });
});

test.describe('Document pages browsing flow', () => {
   test('user can search for a page by title', async ({ page, auth }) => {
      await uploadTestDocument(page, title);

      await expect(page.getByText('Page 1')).toBeVisible();
      await page.getByTestId('search-bar').fill('Page 1');
      await expect(page.getByText('Page 1')).toBeVisible();
   });
});
