import { test, expect } from './fixtures.js';
import {
   createTestCollection,
   testAddDocToCol,
   testSearch,
   uploadTestDocument,
} from './helpers.js';

const colTitle = 'E2E Test Collection';
const docTitle = 'Collection Document';

test.describe('Collection CRUD operations', () => {
   test('contributor can create a collection and see it in the list', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);

      await page.goto('/collections');
      await expect(page.getByText(colTitle)).toBeVisible();

      await page.getByText(colTitle).click();
      await page.waitForURL(/\/collections\/.+/);
      await expect(page.getByText(colTitle)).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can edit a collection', async ({ page, auth }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);

      await page.getByTestId('collection-dropdown-btn').click();
      await expect(page.getByText('Edit')).toBeVisible();

      await page.getByTestId('collection-edit-modal-btn').click();
      await expect(page.getByText('Edit Collection')).toBeVisible();

      const titleInput = page.getByLabel('Title');
      await expect(titleInput).toHaveValue(colTitle);
      await titleInput.fill('Edited title');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Edited title')).toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can delete a collection', async ({ page, auth }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);

      await page.getByTestId('collection-dropdown-btn').click();
      await expect(page.getByText('Delete')).toBeVisible();

      await page.getByTestId('collection-delete-modal-btn').click();
      await expect(page.getByText('Delete Collection')).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.waitForURL('/collections');
      await expect(page.getByText(colTitle)).not.toBeVisible({
         timeout: 15_000,
      });
   });

   test('contributor can add a document to a collection', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);
      await uploadTestDocument(page, docTitle);
      await testAddDocToCol(page, colTitle, docTitle);
   });

   test('contributor can remove a document from a collection', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);
      await uploadTestDocument(page, docTitle);
      await testAddDocToCol(page, colTitle, docTitle);

      await page.goto('/documents');
      await page.getByText(docTitle).click();

      // remove the document from the collection
      await page.getByTestId('doc-dropdown-btn').click();
      await expect(page.getByText('Manage')).toBeVisible();
      await page.getByTestId('doc-save-modal-btn').click();
      await expect(page.getByText('Add to collection')).toBeVisible();
      await page.getByRole('button', { name: colTitle }).click(); // toggling the collection where document is saved = removing
      await page.getByRole('button', { name: 'Save' }).click();

      await page.goto('/collections');
      await page.getByText(colTitle).click();
      await page.waitForURL(/\/collections\/.+/);
      await expect(page.getByText(docTitle)).not.toBeVisible();
   });
});

test.describe('Collections browsing flow', () => {
   test('user can search for a collection by title and see it in the results', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);
      await testSearch(page, '/collections', colTitle);
   });

   test('user can search for documents in the collection', async ({
      page,
      auth,
   }) => {
      // page is already logged in via fixture
      await createTestCollection(page, colTitle);
      await uploadTestDocument(page, docTitle);
      await testAddDocToCol(page, colTitle, docTitle);

      await page.goto('/collections');
      await page.getByText(colTitle).click();
      await expect(page.getByText(colTitle)).toBeVisible();
      await page.getByTestId('search-bar').fill(docTitle);
      await expect(page.getByText(docTitle)).toBeVisible();
   });
});
