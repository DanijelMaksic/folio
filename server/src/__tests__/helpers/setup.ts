import { vi } from 'vitest';

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: { add: vi.fn() },
}));
