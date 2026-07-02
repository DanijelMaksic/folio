import { test, expect } from '@playwright/test';

test('home page loads and shows API status', async ({ page }) => {
   await page.goto('http://localhost:5173');
   await expect(page.getByText('API status: ok')).toBeVisible();
});
