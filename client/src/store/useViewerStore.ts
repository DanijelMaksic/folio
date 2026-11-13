import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewerState {
   scale: number;
   positionX: number;
   positionY: number;
}

export type ImagePosition = 'left' | 'right' | 'top' | 'bottom';

interface ViewerStore {
   viewers: Record<string, ViewerState>;
   focusMode: boolean;
   imagePosition: ImagePosition;
   imageWidth: number;
   setViewerState: (documentId: string, state: ViewerState) => void;
   resetViewerState: (documentId: string) => void;
   setFocusMode: (value: boolean) => void;
   setImagePosition: (value: ImagePosition) => void;
   setImageWidth: (value: number) => void;
}

const DEFAULT_STATE: ViewerState = {
   scale: 1,
   positionX: 0,
   positionY: 0,
};

export const useViewerStore = create<ViewerStore>()(
   persist(
      (set) => ({
         viewers: {},
         focusMode: false,
         imagePosition: 'left',
         imageWidth: 50,
         setViewerState: (documentId, state) =>
            set((store) => ({
               viewers: { ...store.viewers, [documentId]: state },
            })),

         resetViewerState: (documentId) =>
            set((store) => ({
               viewers: { ...store.viewers, [documentId]: DEFAULT_STATE },
            })),

         setFocusMode: (value) => set({ focusMode: value }),
         setImagePosition: (value) => set({ imagePosition: value }),
         setImageWidth: (value) =>
            set({ imageWidth: Math.min(75, Math.max(25, value)) }),
      }),

      {
         name: 'folio-viewer',
         partialize: (s) => ({
            viewers: s.viewers,
            imagePosition: s.imagePosition,
            imageWidth: s.imageWidth,
         }),
      },
   ),
);
