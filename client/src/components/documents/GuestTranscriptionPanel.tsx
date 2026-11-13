import SignInModal from '@/components/documents/SignInModal';
import TranscriptionToolbar from '@/components/documents/TranscriptionToolbar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useViewerStore } from '@/store/useViewerStore';
import { Tag } from '@shared';
import { useState } from 'react';

function GuestTranscriptionPanel({
   onIllegible,
   wrapSelection,
   transcriptionContent,
   approvedTranscriptionContent,
   isHorizontal,
}: {
   onIllegible: () => void;
   wrapSelection: (tag: Tag) => void;
   transcriptionContent: string;
   approvedTranscriptionContent: string;
   isHorizontal: boolean;
}) {
   const [modalOpen, setModalOpen] = useState(false);

   const { focusMode } = useViewerStore();

   return (
      <div
         className={`border rounded-md px-4 py-3 flex-1 h-full flex flex-col gap-3 ${
            focusMode ? 'min-h-0 overflow-hidden' : ''
         }`}
      >
         <div className="flex items-center justify-between gap-6 shrink-0">
            <div className="flex items-center gap-6">
               <h2 className="text-lg font-medium pt-1">Transcription</h2>

               <TranscriptionToolbar
                  disabled={true}
                  onWrap={wrapSelection}
                  onIllegible={onIllegible}
               />
            </div>

            {!isHorizontal && (
               <div className="flex gap-2 items-center justify-end opacity-50 pointer-events-none shrink-0">
                  <div className="flex items-center gap-2 mr-4">
                     <span>Mark as blank</span>
                     <Checkbox className="border-gray-400" />
                  </div>

                  <button className="px-3 py-1 text-sm border rounded hover:bg-muted">
                     Preview
                  </button>

                  <button className="px-3 py-1 text-sm border rounded hover:bg-muted">
                     Save
                  </button>

                  <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">
                     Submit
                  </button>
               </div>
            )}
         </div>
         <Textarea
            className={`font-mono leading-6 disabled:opacity-60 disabled:caret-transparent flex-1 field-sizing-fixed! ${
               focusMode
                  ? 'min-h-0 resize-none overflow-y-auto'
                  : 'min-h-90 resize-y'
            }`}
            value={
               transcriptionContent
                  ? transcriptionContent
                  : approvedTranscriptionContent
            }
            onClick={() => setModalOpen(true)}
            onChange={() => setModalOpen(true)}
            placeholder="Type your transcription here..."
         />

         {isHorizontal && (
            <div className="flex gap-2 items-center justify-end opacity-50 pointer-events-none shrink-0">
               <div className="flex items-center gap-2 mr-4">
                  <span>Mark as blank</span>
                  <Checkbox className="border-gray-400" />
               </div>

               <button className="px-3 py-1 text-sm border rounded hover:bg-muted">
                  Preview
               </button>

               <button className="px-3 py-1 text-sm border rounded hover:bg-muted">
                  Save
               </button>

               <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">
                  Submit
               </button>
            </div>
         )}

         {modalOpen && (
            <SignInModal
               onClose={() => setModalOpen(false)}
               label="transcribe"
            />
         )}
      </div>
   );
}

export default GuestTranscriptionPanel;
