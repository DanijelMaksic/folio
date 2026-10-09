import { defineConfig } from 'tsup';

export default defineConfig({
   entry: ['src/server.ts'],
   format: ['esm'],
   platform: 'node',
   target: 'node22', // match `node -v` locally
   outDir: 'dist',
   clean: true,
   sourcemap: true,
   // shared ships TS source only, so it must be bundled in.
   // Everything else in "dependencies" stays external.
   noExternal: ['@folio/shared'],
});
