// tests/e2e/helpers.ts
import { Page, expect } from '@playwright/test';

export async function uploadTestDocument(page: Page, title: string) {
   await page.goto('/documents/upload');

   await page.getByLabel('Title').fill(title);
   await page.getByLabel('Description').fill('Uploaded by Playwright');

   await page.getByLabel('File').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
         'base64',
      ),
   });

   await page.getByRole('button', { name: 'Upload' }).click();
   await page.waitForURL(/\/documents\/.+/);
   await expect(page.getByText(title)).toBeVisible();
}

export async function createTestCollection(page: Page, title: string) {
   await page.goto('/collections/create');

   await page.getByLabel('Title').fill(title);
   await page.getByLabel('Description').fill('Created by Playwright');

   await page.getByRole('button', { name: 'Create' }).click();
   await page.waitForURL(/\/collections\/.+/);
   await expect(page.getByText(title)).toBeVisible();
}

export async function testSearch(page: Page, url: string, title: string) {
   await page.goto(url);
   await expect(page.getByText(title)).toBeVisible();

   await page.getByTestId('search-bar').fill(title);
   await expect(page.getByText(title)).toBeVisible();
}

export async function testAddDocToCol(
   page: Page,
   colTitle: string,
   docTitle: string,
) {
   await page.getByTestId('doc-dropdown-btn').click();
   await expect(page.getByText('Save')).toBeVisible();

   await page.getByTestId('doc-save-modal-btn').click();
   await expect(page.getByText('Add to collection')).toBeVisible();
   await page.getByRole('button', { name: colTitle }).click();
   await page.getByRole('button', { name: 'Save' }).click();

   await page.goto('/collections');
   await page.getByText(colTitle).click();
   await page.waitForURL(/\/collections\/.+/);
   await expect(page.getByText(docTitle)).toBeVisible();
}
