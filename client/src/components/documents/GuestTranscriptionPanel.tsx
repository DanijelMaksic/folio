import SignInModal from '@/components/documents/SignInModal';
import TranscriptionToolbar from '@/components/documents/TranscriptionToolbar';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useViewerStore } from '@/store/useViewerStore';
import { Tag, Transcription } from '@shared';
import { useState } from 'react';

function GuestTranscriptionPanel({
   onIllegible,
   wrapSelection,
   transcriptionContent,
   approvedTranscriptionContent,
}: {
   onIllegible: () => void;
   wrapSelection: (tag: Tag) => void;
   transcriptionContent: string;
   approvedTranscriptionContent: string;
}) {
   const [modalOpen, setModalOpen] = useState(false);

   const { focusMode } = useViewerStore();

   return (
      <div
         className={`border rounded-md px-4 py-3 h-full ${
            focusMode
               ? 'flex flex-col gap-3 min-h-0 overflow-hidden'
               : 'space-y-3'
         }`}
      >
         <div
            className={`flex flex-col gap-3 ${focusMode ? 'flex-1 min-h-0' : ''}`}
         >
            {' '}
            <div className="flex items-center justify-between gap-6">
               <div className="flex items-center gap-6">
                  <h2 className="text-lg font-medium pt-1">Transcription</h2>

                  <TranscriptionToolbar
                     disabled={true}
                     onWrap={wrapSelection}
                     onIllegible={onIllegible}
                  />
               </div>

               <div className="text-sm text-muted-foreground capitalize flex gap-2">
                  <p className="italic self-end">Status: Draft</p>
               </div>
            </div>
            <Textarea
               className={`font-mono disabled:opacity-60 leading-6 disabled:caret-transparent ${
                  focusMode
                     ? 'flex-1 min-h-0 resize-none overflow-y-auto field-sizing-fixed!'
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
         </div>

         <div className="flex gap-2 items-center justify-end opacity-50 pointer-events-none">
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
