import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
   test: {
      globals: true,
      include: ['server/src/tests/**/*.test.ts'],
      setupFiles: ['./vitest.setup.ts'],
      globalSetup: ['./server/src/tests/globalSetup.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
   },
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './server/src'),
      },
   },
});
