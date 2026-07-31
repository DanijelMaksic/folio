import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from '@playwright/test';

if (!process.env.CI) {
   dotenv.config({ path: path.resolve(__dirname, 'server/.env') });
}

export default defineConfig({
   testDir: './tests/e2e',
   reporter: [['html', { open: 'on-failure' }]],
   // webServer: {
   //    command: process.env.CI ? 'npm run dev:ci' : 'npm run dev',
   //    url: 'http://localhost:3000/api/health',
   //    reuseExistingServer: true,
   //    timeout: 120_000,
   // },
   webServer: [
      {
         command: process.env.CI
            ? 'npm run dev:ci'
            : 'npm run dev --workspace=server',
         url: 'http://localhost:3000/api/health',
         reuseExistingServer: true,
         timeout: 120_000,
      },
      {
         command: process.env.CI
            ? 'npm run preview'
            : 'npm run dev --workspace=client',
         url: 'http://localhost:5173',
         reuseExistingServer: true,
         timeout: 120_000,
      },
   ],
   use: {
      baseURL: 'http://localhost:5173',
      screenshot: 'only-on-failure',
   },
});
