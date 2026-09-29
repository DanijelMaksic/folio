import { app } from '@/app.js';

console.log('Attempting to load PDF worker...');

try {
   await import('./workers/pdf-worker.js');
   console.log('PDF worker started');
} catch (err) {
   console.error('PDF worker failed to load:', err);
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
