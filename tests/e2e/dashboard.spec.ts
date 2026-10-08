import { test, expect } from './fixtures.js';
import { cleanupCloudinaryFolder } from './global-setup.js';
import { uploadTestDocument } from './helpers.js';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('folio/documents');
});

test.describe('Dashboard access', () => {
   test('unauthenticated visitor is redirected to login', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForURL('/login', { timeout: 15_000 });
   });

   test('viewer sees the contributor gate instead of the dashboard', async ({
      page,
      loginAs,
   }) => {
      await loginAs('viewer');

      await expect(page.getByText('available to contributors')).toBeVisible();
      await expect(page.getByText('Your activity')).not.toBeVisible();

      await page
         .getByRole('link', { name: 'Request contributor role' })
         .click();
      await page.waitForURL('/profile', { timeout: 15_000 });
   });
});

test.describe('Contributor dashboard', () => {
   test('shows welcome header, empty state and zeroed stats for a new contributor', async ({
      page,
      auth,
   }) => {
      await expect(
         page.getByRole('heading', { name: /Welcome back/ }),
      ).toBeVisible();
      await expect(page.getByText('Your activity')).toBeVisible();
      await expect(
         page.getByText("You haven't uploaded any documents yet."),
      ).toBeVisible();

      const documentsStat = page
         .locator('dt', { hasText: 'Documents' })
         .locator('..');
      await expect(documentsStat).toContainText('0');
   });

   test('uploaded document appears in recent documents and updates the stat', async ({
      page,
      auth,
   }) => {
      const title = `Dashboard Doc ${Date.now()}`;
      await uploadTestDocument(page, title);

      await page.goto('/dashboard');

      const card = page
         .getByTestId('dashboard-document')
         .filter({ hasText: title });
      await card.waitFor({ state: 'visible', timeout: 15_000 });

      const documentsStat = page
         .locator('dt', { hasText: 'Documents' })
         .locator('..');
      await expect(documentsStat).toContainText('1');

      await card.click();
      await page.waitForURL(/\/documents\/.+/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: title })).toBeVisible({
         timeout: 15_000,
      });
   });

   test('upload button navigates to the upload page', async ({
      page,
      auth,
   }) => {
      await page.getByRole('link', { name: 'Upload document' }).click();
      await page.waitForURL('/documents/upload', { timeout: 15_000 });
   });

   test('does not show editor or admin attention cards', async ({
      page,
      auth,
   }) => {
      await expect(
         page.getByRole('heading', { name: /Welcome back/ }),
      ).toBeVisible();
      await expect(page.getByTestId('attention-review')).toHaveCount(0);
      await expect(page.getByTestId('attention-roles')).toHaveCount(0);
   });
});

test.describe('Editor and admin dashboards', () => {
   test('editor sees the review queue card and it links to /review', async ({
      page,
      loginAs,
   }) => {
      await loginAs('editor');

      const card = page.getByTestId('attention-review');
      await card.waitFor({ state: 'visible', timeout: 15_000 });
      await expect(card).toContainText('transcriptions awaiting review');
      await expect(page.getByTestId('attention-roles')).toHaveCount(0);

      await card.click();
      await page.waitForURL('/review', { timeout: 15_000 });
   });

   test('admin sees both cards and the role requests card opens the roles tab', async ({
      page,
      loginAs,
   }) => {
      await loginAs('admin');

      await page
         .getByTestId('attention-review')
         .waitFor({ state: 'visible', timeout: 15_000 });
      const rolesCard = page.getByTestId('attention-roles');
      await expect(rolesCard).toContainText('pending role requests');

      await rolesCard.click();
      await page.waitForURL(/\/profile\?tab=roles/, { timeout: 15_000 });
      await expect(
         page.getByRole('tab', { name: /Role requests/ }),
      ).toHaveAttribute('aria-selected', 'true');
   });
});
