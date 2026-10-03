// server.ts
import { app } from '@/app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () =>
   console.log(`Server running on http://localhost:${PORT}`),
);

// Start worker after server is already listening, with a small delay
// to give Redis time to be ready on cold boot
setTimeout(async () => {
   try {
      await import('./workers/pdf-worker.js');
      console.log('PDF worker started');
   } catch (err) {
      console.error('PDF worker failed to load:', err);
   }
}, 3000);
