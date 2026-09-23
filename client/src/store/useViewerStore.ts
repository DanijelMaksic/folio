import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewerState {
   scale: number;
   positionX: number;
   positionY: number;
}

interface ViewerStore {
   viewers: Record<string, ViewerState>;
   setViewerState: (documentId: string, state: ViewerState) => void;
   resetViewerState: (documentId: string) => void;
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

         setViewerState: (documentId, state) =>
            set((store) => ({
               viewers: { ...store.viewers, [documentId]: state },
            })),

         resetViewerState: (documentId) =>
            set((store) => ({
               viewers: { ...store.viewers, [documentId]: DEFAULT_STATE },
            })),
      }),
      {
         name: 'folio-viewer',
      },
   ),
);
