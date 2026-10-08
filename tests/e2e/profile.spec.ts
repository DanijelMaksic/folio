import { Browser, Page } from '@playwright/test';
import { test, expect } from './fixtures.js';
import { seedUser, cleanupUser, type Role } from './global-setup.js';

const REQUEST_MESSAGE =
   'I would like to help transcribe more historical documents.';

// Seeds a user and logs them in inside an isolated browser context
async function loginInNewContext(browser: Browser, role: Role) {
   const tag = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
   const creds = {
      email: `e2e+${role}${tag}@example.com`,
      password: 'Password123!',
      username: `e2e${role}${tag}`,
   };
   await seedUser({ ...creds, name: `E2E ${role} ${tag}` }, role);

   const context = await browser.newContext();
   const page = await context.newPage();
   await page.goto('/login');
   await page.getByLabel('Email').fill(creds.email);
   await page.getByLabel('Password').fill(creds.password);
   await page.getByRole('button', { name: 'Sign in' }).click();
   await page.waitForURL('/dashboard');

   return { page, context, ...creds };
}

async function submitRoleRequest(page: Page, buttonName: RegExp) {
   await page.goto('/profile');
   await page.getByRole('button', { name: buttonName }).click();

   const dialog = page.getByRole('dialog');
   await dialog.getByRole('textbox').fill(REQUEST_MESSAGE);
   // Button label is a guess, match your RequestRoleModal
   await dialog.getByRole('button', { name: /Send request|Submit/ }).click();

   await expect(dialog).not.toBeVisible({ timeout: 15_000 });
   await expect(page.getByText('Request pending')).toBeVisible({
      timeout: 15_000,
   });
}

test.describe('Profile page', () => {
   test('shows header, details and the default stats tab', async ({
      page,
      auth,
   }) => {
      await page.goto('/profile');

      await expect(page.getByText(`@${auth.username}`)).toBeVisible();
      await expect(page.getByText(auth.email)).toBeVisible();
      await expect(
         page.getByRole('tab', { name: 'Contribution stats' }),
      ).toHaveAttribute('aria-selected', 'true');
   });

   test('tabs sync with the URL and deep links work', async ({
      page,
      auth,
   }) => {
      await page.goto('/profile');

      await page.getByRole('tab', { name: 'Profile settings' }).click();
      await expect(page).toHaveURL(/\/profile\?tab=settings/);

      await page.getByRole('tab', { name: 'Contribution stats' }).click();
      await expect(page).not.toHaveURL(/tab=/);

      await page.goto('/profile?tab=settings');
      await expect(
         page.getByRole('tab', { name: 'Profile settings' }),
      ).toHaveAttribute('aria-selected', 'true');
   });

   test('non-admin has no Role requests tab and ?tab=roles falls back to stats', async ({
      page,
      auth,
   }) => {
      await page.goto('/profile?tab=roles');

      await expect(
         page.getByRole('tab', { name: /Role requests/ }),
      ).toHaveCount(0);
      await expect(
         page.getByRole('tab', { name: 'Contribution stats' }),
      ).toHaveAttribute('aria-selected', 'true');
   });

   test('user can edit their display name', async ({ page, auth }) => {
      const newName = `Renamed ${Date.now()}`;
      await page.goto('/profile?tab=settings');

      await page.getByRole('button', { name: /Edit profile/ }).click();
      const dialog = page.getByRole('dialog');

      // Field label is a guess, match your EditProfileModal
      await dialog.getByLabel('Name', { exact: true }).fill(newName);
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(dialog).not.toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('heading', { name: newName })).toBeVisible({
         timeout: 15_000,
      });
   });
});

test.describe('Role requests', () => {
   test('editor sees no role request card', async ({ page, loginAs }) => {
      await loginAs('editor');
      await page.goto('/profile');

      await expect(page.getByRole('button', { name: /Become a/ })).toHaveCount(
         0,
      );
   });

   test('contributor sees "Become a editor"', async ({ page, auth }) => {
      await page.goto('/profile');
      await expect(
         page.getByRole('button', { name: /Become a editor/ }),
      ).toBeVisible();
   });

   test('request message shorter than 20 characters is rejected', async ({
      page,
      loginAs,
   }) => {
      await loginAs('viewer');
      await page.goto('/profile');

      await page.getByRole('button', { name: /Become a contributor/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox').fill('too short');
      await dialog.getByRole('button', { name: /Send request|Submit/ }).click();

      // Dialog stays open and nothing becomes pending
      await expect(dialog).toBeVisible();
      await expect(page.getByText('Request pending')).toHaveCount(0);
   });

   test('viewer requests contributor, admin approves, viewer can contribute', async ({
      page,
      browser,
      loginAs,
   }) => {
      const viewer = await loginAs('viewer');
      await submitRoleRequest(page, /Become a contributor/);

      const admin = await loginInNewContext(browser, 'admin');
      try {
         await admin.page.goto('/profile?tab=roles');

         const card = admin.page
            .getByTestId('role-request')
            .filter({ hasText: viewer.username });
         await card.waitFor({ state: 'visible', timeout: 15_000 });
         await expect(card).toContainText(REQUEST_MESSAGE);

         await card.getByRole('button', { name: 'Approve' }).click();
         await expect(card).not.toBeVisible({ timeout: 15_000 });
      } finally {
         await admin.context.close();
         await cleanupUser(admin.email);
      }

      // Fresh login so a cached session can't hide the new role
      await page.context().clearCookies();
      await page.goto('/login');
      await page.getByLabel('Email').fill(viewer.email);
      await page.getByLabel('Password').fill(viewer.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('/dashboard');

      await expect(
         page.getByRole('heading', { name: /Welcome back/ }),
      ).toBeVisible({ timeout: 15_000 });
   });

   test('admin rejects with a reason, viewer sees it and can request again', async ({
      page,
      browser,
      loginAs,
   }) => {
      const viewer = await loginAs('viewer');
      await submitRoleRequest(page, /Become a contributor/);

      const admin = await loginInNewContext(browser, 'admin');
      try {
         await admin.page.goto('/profile?tab=roles');

         const card = admin.page
            .getByTestId('role-request')
            .filter({ hasText: viewer.username });
         await card.waitFor({ state: 'visible', timeout: 15_000 });

         await card.getByRole('button', { name: 'Reject' }).click();
         const dialog = admin.page.getByRole('dialog');
         await dialog.getByRole('textbox').fill('Please add more detail.');
         await dialog.getByRole('button', { name: 'Reject' }).click();

         await expect(card).not.toBeVisible({ timeout: 15_000 });
      } finally {
         await admin.context.close();
         await cleanupUser(admin.email);
      }

      await page.goto('/profile');
      await expect(
         page.getByText('Your last request was declined'),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Please add more detail.')).toBeVisible();
      await expect(
         page.getByRole('button', { name: 'Request again' }),
      ).toBeVisible();
   });
});
