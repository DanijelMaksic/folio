import { test, expect } from './fixtures.js';
import { createTestCollection, testSearch } from './helpers.js';

const title = 'E2E Test Collection';

test.describe('Collection creation flow', () => {
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
});

test.describe('Collections browsing flow', () => {
   test('user can search for the collection by title and see it in results', async ({
      page,
      auth,
   }) => {
      await createTestCollection(page, title);
      await testSearch(page, '/collections', title);
   });
});
