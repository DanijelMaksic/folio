// lib/image-layout.ts
import type { ImagePosition } from '@/store/useViewerStore';

export const LAYOUTS: Record<
   ImagePosition,
   { grid: string; focusGrid: string; image: string }
> = {
   default: {
      grid: 'grid-cols-2',
      focusGrid: 'grid-cols-2',
      image: 'order-first',
   },
   left: {
      grid: 'grid-cols-2',
      focusGrid: 'grid-cols-2',
      image: 'order-first',
   },
   right: {
      grid: 'grid-cols-2',
      focusGrid: 'grid-cols-2',
      image: 'order-last',
   },
   top: {
      grid: 'grid-rows-1',
      focusGrid: 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
      image: 'order-first',
   },
   bottom: {
      grid: 'grid-rows-1',
      focusGrid: 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
      image: 'order-last',
   },
};
