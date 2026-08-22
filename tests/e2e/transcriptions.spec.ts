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
   test.setTimeout(60_000);

   test('contributor can transcribe document and see the changes in transcription history', async ({
      page,
   }) => {
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

      await page.getByRole('button', { name: 'Upload' }).click();
      await page.waitForURL(/\/documents\/.+/);
      await expect(page.getByText(docTitle)).toBeVisible();

      await page.getByRole('button', { name: 'Start transcribing' }).click();
      await expect(page.getByTestId('transcription-content')).toBeVisible();

      await page
         .getByTestId('transcription-content')
         .fill('Transcription content.');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('transcription-status')).toHaveText(
         'draft',
      );

      await page.getByRole('button', { name: 'Show revision history' }).click();
      await expect(page.getByTestId('transcription-revision')).toBeVisible();
   });
});
