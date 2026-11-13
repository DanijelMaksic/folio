import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { useViewerStore } from '@/store/useViewerStore';

export function useImageLayout() {
   const { imagePosition, focusMode, imageWidth, setImageWidth } =
      useViewerStore();

   const gridRef = useRef<HTMLDivElement>(null);

   const stacked = imagePosition === 'top' || imagePosition === 'bottom';
   const imageFirst = imagePosition !== 'right' && imagePosition !== 'bottom';

   // full literal class strings so Tailwind sees them
   const cols = stacked ? 'grid-cols-1' : 'grid-cols-2';
   const focusRows = stacked
      ? 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]'
      : 'grid-rows-[minmax(0,1fr)]';

   const gridStyle: CSSProperties | undefined = stacked
      ? undefined
      : {
           gridTemplateColumns: imageFirst
              ? `${imageWidth}% auto minmax(0,1fr)`
              : `minmax(0,1fr) auto ${imageWidth}%`,
        };

   const onHandlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
   };

   const onHandlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setImageWidth(imageFirst ? pct : 100 - pct);
   };

   return {
      focusMode,
      gridRef,
      gridStyle,
      showHandle: !stacked,
      grid: `grid ${stacked ? 'gap-4' : 'gap-0'} ${cols} ${
         focusMode ? `h-full min-h-0 ${focusRows}` : ''
      }`,
      imageCell: `${imageFirst ? 'order-1' : 'order-3'} ${
         focusMode
            ? 'h-full min-h-0'
            : stacked
              ? ''
              : 'sticky top-24 self-start'
      }`,
      panelCell: `${imageFirst ? 'order-3' : 'order-1'} ${
         focusMode
            ? 'h-full min-h-0 flex flex-col'
            : 'self-stretch flex flex-col'
      }`,
      handleProps: {
         onPointerDown: onHandlePointerDown,
         onPointerMove: onHandlePointerMove,
         onDoubleClick: () => setImageWidth(50),
      },
   };
}
