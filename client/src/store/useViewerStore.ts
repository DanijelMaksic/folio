import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewerState {
   scale: number;
   positionX: number;
   positionY: number;
}

export type ImagePosition = 'default' | 'left' | 'right' | 'top' | 'bottom';

interface ViewerStore {
   viewers: Record<string, ViewerState>;
   focusMode: boolean;
   imagePosition: ImagePosition;
   setViewerState: (documentId: string, state: ViewerState) => void;
   resetViewerState: (documentId: string) => void;
   setFocusMode: (value: boolean) => void;
   setImagePosition: (value: ImagePosition) => void;
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
         imagePosition: 'default',
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
      }),

      {
         name: 'folio-viewer',
         partialize: (s) => ({
            viewers: s.viewers,
            imagePosition: s.imagePosition,
         }),
      },
   ),
);
