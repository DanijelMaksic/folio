import { configDefaults, defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
   test: {
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
   },
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './server/src'),
      },
   },
});
