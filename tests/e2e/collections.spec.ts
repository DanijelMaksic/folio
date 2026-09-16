import { test, expect } from './fixtures.js';
import {
   createTestCollection,
   testAddDocToCol,
   testSearch,
   uploadTestDocument,
} from './helpers.js';

const title = 'E2E Test Collection';

test.describe('Collection CRUD operations', () => {
   test('contributor can create a collection and see it in the list', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);

      await page.goto('/collections');
      await expect(page.getByText(title)).toBeVisible();

      await page.getByText(title).click();
      await page.waitForURL(/\/collections\/.+/);
      await expect(page.getByText(title)).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can edit a collection', async ({ page, auth }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);

      await page.getByTestId('collection-dropdown-btn').click();
      await expect(page.getByText('Edit')).toBeVisible();

      await page.getByTestId('collection-edit-modal-btn').click();
      await expect(page.getByText('Edit Collection')).toBeVisible();

      const titleInput = page.getByLabel('Title');
      await expect(titleInput).toHaveValue(title);
      await titleInput.fill('Edited title');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Edited title')).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can delete a collection', async ({ page, auth }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);

      await page.getByTestId('collection-dropdown-btn').click();
      await expect(page.getByText('Delete')).toBeVisible();

      await page.getByTestId('collection-delete-modal-btn').click();
      await expect(page.getByText('Delete Collection')).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.waitForURL('/collections');
      await expect(page.getByText(title)).not.toBeVisible({ timeout: 15_000 });
   });

   test('contributor can add a document to a collection', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);
      await uploadTestDocument(page, 'Collection Document');
      await testAddDocToCol(page, title);
   });

   test('contributor can remove a document from a collection', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);
      await uploadTestDocument(page, 'Collection Document');
      await testAddDocToCol(page, title);

      await page.goto('/documents');
      await page.getByText('Collection Document').click();

      await page.getByTestId('doc-dropdown-btn').click();
      await expect(page.getByText('Manage')).toBeVisible();
      await page.getByTestId('doc-save-modal-btn').click();
      await expect(page.getByText('Add to collection')).toBeVisible();
      await page.getByRole('button', { name: title }).click(); // toggling the collection where document is saved
      await page.getByRole('button', { name: 'Save' }).click();

      await page.goto('/collections');
      await page.getByText(title).click();
      await page.waitForURL(/\/collections\/.+/);
      await expect(page.getByText('Collection Document')).not.toBeVisible();
   });
});

test.describe('Collections browsing flow', () => {
   test('user can search for the collection by title and see it in results', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, title);
      await testSearch(page, '/collections', title);
   });
});
