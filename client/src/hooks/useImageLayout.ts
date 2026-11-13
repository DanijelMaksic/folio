import { useViewerStore, type ImagePosition } from '@/store/useViewerStore';

const SIDE_FOCUS = 'grid-cols-2 grid-rows-[minmax(0,1fr)]';
const STACK_FOCUS = 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]';

const LAYOUTS: Record<
   ImagePosition,
   { cols: string; focusCols: string; image: string; stacked: boolean }
> = {
   default: {
      cols: 'grid-cols-2',
      focusCols: SIDE_FOCUS,
      image: 'order-first',
      stacked: false,
   },
   left: {
      cols: 'grid-cols-2',
      focusCols: SIDE_FOCUS,
      image: 'order-first',
      stacked: false,
   },
   right: {
      cols: 'grid-cols-2',
      focusCols: SIDE_FOCUS,
      image: 'order-last',
      stacked: false,
   },
   top: {
      cols: 'grid-cols-1',
      focusCols: STACK_FOCUS,
      image: 'order-first',
      stacked: true,
   },
   bottom: {
      cols: 'grid-cols-1',
      focusCols: STACK_FOCUS,
      image: 'order-last',
      stacked: true,
   },
};

export function useImageLayout() {
   const { imagePosition, focusMode } = useViewerStore();
   const l = LAYOUTS[imagePosition];

   return {
      focusMode,
      grid: focusMode
         ? `h-full min-h-0 ${l.focusCols}`
         : `items-start ${l.cols}`,
      imageCell: `${l.image} ${
         focusMode ? 'h-full min-h-0' : l.stacked ? '' : 'sticky top-24'
      }`,
      panelCell: focusMode ? 'h-full min-h-0' : '',
   };
}
