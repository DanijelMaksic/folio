import { test, expect } from './fixtures.js';
import { cleanupCloudinaryFolder } from './global-setup.js';
import { testSearch, uploadTestDocument } from './helpers.js';

const title = 'E2E Test Document';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('folio/documents');
});

test.describe('Document CRUD operations', () => {
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

   test('contributor can edit a document', async ({ page, auth }) => {
      // page is already logged in via fixture
      await uploadTestDocument(page, title);

      await page.getByTestId('actions-dropdown-btn').click();
      await expect(page.getByText('Edit')).toBeVisible();

      await page.getByTestId('edit-modal-btn').click();
      await expect(page.getByText('Edit Document')).toBeVisible();

      const titleInput = page.getByLabel('Title');
      await expect(titleInput).toHaveValue(title);
      await titleInput.fill('Edited title');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Edited title')).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can delete a document', async ({ page, auth }) => {
      // page is already logged in via fixture
      await uploadTestDocument(page, title);

      await page.getByTestId('actions-dropdown-btn').click();
      await expect(page.getByText('Delete')).toBeVisible();

      await page.getByTestId('delete-modal-btn').click();
      await expect(page.getByText('Delete Document')).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.waitForURL('/documents');
      await expect(page.getByText(title)).not.toBeVisible();
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
