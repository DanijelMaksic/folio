import { useViewerStore } from '@/store/useViewerStore';
import type { Page } from '@shared';
import { useState } from 'react';
import {
   TransformWrapper,
   TransformComponent,
   useControls,
   useTransformEffect,
} from 'react-zoom-pan-pinch';

const Controls = ({ pageId }: { pageId: string }) => {
   const { zoomIn, zoomOut, resetTransform } = useControls();
   const { resetViewerState } = useViewerStore();

   return (
      <div className="tools absolute left-[43%] top-4 z-10 bg-white/80 flex items-center justify-center gap-6 py-1 px-3 rounded-md shadow-md">
         <button type="button" onClick={() => zoomIn()}>
            +
         </button>
         <button type="button" onClick={() => zoomOut()}>
            -
         </button>
         <button
            type="button"
            onClick={() => {
               resetViewerState(pageId);
               resetTransform();
            }}
         >
            x
         </button>
      </div>
   );
};

const TransformTracker = ({ pageId }: { pageId: string }) => {
   const { setViewerState } = useViewerStore();

   useTransformEffect(({ state }) => {
      setViewerState(pageId, {
         scale: state.scale,
         positionX: state.positionX,
         positionY: state.positionY,
      });
   });

   return null;
};

function DocumentViewer({ page }: { page: Page | undefined }) {
   const { viewers } = useViewerStore();
   const savedState = viewers[page?.id ?? ''];
   const [isHovered, setIsHovered] = useState(false);

   if (!document || !page) return null;

   return (
      <div
         className="bg-gray-200 min-h-130 flex justify-center items-center rounded-md overflow-hidden relative"
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
      >
         <TransformWrapper
            limitToBounds={false}
            initialScale={savedState?.scale ?? 1}
            initialPositionX={savedState?.positionX ?? 0}
            initialPositionY={savedState?.positionY ?? 0}
            panning={{ disabled: false, velocityDisabled: true }}
            minScale={0.8}
            animation={{
               disabled: false,
               duration: 300,
               animationType: 'easeOut',
            }}
            doubleClick={{ disabled: false, step: 0.3, animationTime: 300 }}
            wheel={{
               disabled: false,
               step: 0.003,
               smoothStep: 0.002,
            }}
         >
            {isHovered && <Controls pageId={page.id} />}

            <TransformTracker pageId={page.id} />
            <TransformComponent
               wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  minHeight: '520px', // Matches your min-h-130 (130 * 4px)
               }}
               contentStyle={{
                  width: '100%',
                  height: '100%',
                  minHeight: '520px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
               }}
            >
               <img
                  src={page.imageUrl}
                  alt={page.title}
                  className="w-fit max-h-[70vh] shadow-sm"
               />
            </TransformComponent>
         </TransformWrapper>
      </div>
   );
}

export default DocumentViewer;
