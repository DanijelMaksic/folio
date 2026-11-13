import type { ComponentProps } from 'react';

function ResizeHandle(props: ComponentProps<'div'>) {
   return (
      <div
         role="separator"
         aria-orientation="vertical"
         aria-label="Resize image and transcription"
         title="Drag to resize, double-click to reset"
         className="group relative order-2 flex w-4 cursor-col-resize touch-none select-none items-center justify-center self-stretch"
         {...props}
      >
         <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 group-hover:bg-gray-500" />
         <div className="relative h-10 w-1.5 rounded-full bg-gray-500" />
      </div>
   );
}

export default ResizeHandle;
