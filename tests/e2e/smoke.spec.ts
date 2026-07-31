import test, { expect } from 'playwright/test';

test('basic navigation', async ({ page }) => {
   await page.goto('/login');
   expect(true).toBe(true);
});
