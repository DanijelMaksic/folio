import { useViewerStore } from '@/store/useViewerStore';
import type { PageBase } from '@shared';
import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
   TransformWrapper,
   TransformComponent,
   useControls,
   useTransformEffect,
} from 'react-zoom-pan-pinch';

const Controls = ({
   pageId,
   isFullscreen,
   onToggleFullscreen,
}: {
   pageId: string;
   isFullscreen: boolean;
   onToggleFullscreen: () => void;
}) => {
   const { zoomIn, zoomOut, resetTransform } = useControls();
   const { resetViewerState } = useViewerStore();

   return (
      <div className="tools absolute left-1/2 -translate-x-1/2 top-4 z-10 bg-white/80 flex items-center justify-center gap-6 py-1 px-3 rounded-md shadow-md">
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
         {document.fullscreenEnabled && (
            <button
               type="button"
               onClick={onToggleFullscreen}
               aria-label={
                  isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
               }
            >
               {isFullscreen ? (
                  <Minimize className="size-4" />
               ) : (
                  <Maximize className="size-4" />
               )}
            </button>
         )}
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

function PageViewer({ page }: { page: PageBase | undefined }) {
   const { viewers, focusMode } = useViewerStore();
   const savedState = viewers[page?.id ?? ''];
   const [isHovered, setIsHovered] = useState(false);
   const [isFullscreen, setIsFullscreen] = useState(false);
   const containerRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const el = containerRef.current;
      const onChange = () => setIsFullscreen(document.fullscreenElement === el);
      document.addEventListener('fullscreenchange', onChange);
      return () => {
         document.removeEventListener('fullscreenchange', onChange);
         if (document.fullscreenElement === el) {
            document.exitFullscreen().catch(() => {});
         }
      };
   }, []);

   function toggleFullscreen() {
      if (document.fullscreenElement) {
         document.exitFullscreen().catch(() => {});
      } else {
         containerRef.current?.requestFullscreen().catch(() => {});
      }
   }

   if (!page) return null;

   const fill = focusMode || isFullscreen;

   return (
      <div
         ref={containerRef}
         className={`bg-gray-200 flex justify-center items-center rounded-md overflow-hidden relative ${
            isFullscreen
               ? 'h-screen w-full'
               : focusMode
                 ? 'h-full min-h-0'
                 : 'min-h-130'
         }`}
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
            wheel={{ disabled: false, step: 0.003, smoothStep: 0.002 }}
            wrapperStyle={{
               width: '100%',
               height: '100%',
               minHeight: fill ? 0 : '520px',
            }}
            contentStyle={{
               width: '100%',
               height: '100%',
               minHeight: fill ? 0 : '520px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
            }}
         >
            {isHovered && (
               <Controls
                  pageId={page.id}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
               />
            )}

            <TransformTracker pageId={page.id} />
            <TransformComponent
               wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  minHeight: fill ? 0 : '520px',
               }}
               contentStyle={{
                  width: '100%',
                  height: '100%',
                  minHeight: fill ? 0 : '520px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
               }}
            >
               <img
                  src={page.imageUrl}
                  alt={page.title}
                  className={`w-fit shadow-sm ${fill ? 'max-h-full' : 'max-h-[70vh]'}`}
               />
            </TransformComponent>
         </TransformWrapper>
      </div>
   );
}

export default PageViewer;
