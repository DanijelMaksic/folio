import { test, expect } from './fixtures.js';
import { cleanupUser } from './globalSetup';

const testUser = {
   email: 'test_e2e_transcriptions@example.com',
   password: 'Password123!',
   username: 'e2eTranscriptions',
   name: 'E2E Transcription user',
};

const docTitle = 'Document';

test.afterAll(async () => {
   await cleanupUser(testUser.email);
});

test.describe('Transcription flow', () => {
   test('contributor can transcribe document and see the changes in transcription history', async ({
      page,
   }) => {
      // page is already logged in via fixture

      test.setTimeout(60_000); // CI is slower; upload + transcribe need headroom

      // Upload document
      await page.goto('/documents/upload');

      await page.getByLabel('Title').fill(docTitle);
      await page.getByLabel('Description').fill('Uploaded by Playwright');

      await page.getByLabel('File').setInputFiles({
         name: 'test.png',
         mimeType: 'image/png',
         buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
         ),
      });

      // Register listener just before the action that causes the redirect
      const transcriptionPanelReady = page.waitForResponse(
         (res) =>
            res.url().includes('transcriptions.getByDocument') &&
            res.status() === 200,
         { timeout: 15_000 },
      );

      await page.getByRole('button', { name: 'Upload' }).click();

      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText(docTitle)).toBeVisible();

      // Now await the response that was already captured
      await transcriptionPanelReady;

      // Transcribe document
      const createResponse = page.waitForResponse(
         (res) =>
            res.url().includes('transcriptions.create') && res.status() === 200,
      );
      await page.getByRole('button', { name: 'Start transcribing' }).click();
      await createResponse;

      // Wait for textarea to actually render before filling
      await expect(page.getByTestId('transcription-content')).toBeVisible({
         timeout: 15_000,
      });

      await page
         .getByTestId('transcription-content')
         .fill('Transcription content.');

      // Wait for save to complete on the network level
      const saveResponse = page.waitForResponse(
         (res) => res.url().includes('transcriptions.update'), // no status filter
         { timeout: 15_000 },
      );
      await page.getByRole('button', { name: 'Save' }).click();
      const res = await saveResponse;
      expect(res.status()).toBe(200);

      await expect(page.getByTestId('transcription-status')).toHaveText(
         'draft',
      );

      // Wait for revision history fetch before asserting the element
      const revisionResponse = page.waitForResponse(
         (res) =>
            res.url().includes('transcriptions.getRevisions') &&
            res.status() === 200,
      );

      await page.getByRole('button', { name: 'Show revision history' }).click();
      await revisionResponse;

      await expect(page.getByTestId('transcription-revision')).toBeVisible();
   });
});
