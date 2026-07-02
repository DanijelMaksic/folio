import { defineConfig } from '@playwright/test';

export default defineConfig({
   testDir: './tests/e2e',
   webServer: {
      command: process.env.CI ? 'npm run dev:ci' : 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
   },
   use: {
      baseURL: 'http://localhost:5173',
   },
});
