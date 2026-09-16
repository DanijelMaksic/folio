import { test, expect } from './fixtures.js';
import { cleanupCloudinaryFolder } from './global-setup.js';
import { uploadTestDocument } from './helpers.js';

const title = 'Test Document';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('folio/documents');
});

test.describe('Transcription flow', () => {
   test.setTimeout(60_000);

   test('contributor can transcribe document and see the changes in transcription history', async ({
      page,
      auth,
   }) => {
      await uploadTestDocument(page, title);

      await page.getByTestId('transcribe-tab-btn').click();
      await page.getByRole('button', { name: 'Start transcribing' }).click();
      await expect(page.getByTestId('transcription-content')).toBeVisible();

      await page
         .getByTestId('transcription-content')
         .fill('Transcription content.');

      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('transcription-status')).toHaveText(
         'draft',
      );

      await page.getByTestId('revision-tab-btn').click();
      await expect(page.getByTestId('transcription-revision')).toBeVisible();
   });
});
