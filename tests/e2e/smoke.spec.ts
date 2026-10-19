import test, { expect } from 'playwright/test';

test('basic navigation', async ({ page }) => {
   await page.goto('/sign-in');
   expect(true).toBe(true);
});
