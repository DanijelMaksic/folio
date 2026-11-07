import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Transcription } from '@shared';
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';
import TranscriptionToolbar from '@/components/documents/TranscriptionToolbar';

function TranscriptionPanel({
   transcription,
   pageId,
}: {
   transcription?: Transcription;
   pageId?: string;
}) {
   const [transcriptionContent, setTranscriptionContent] = useState('');

   const textareaRef = useRef<HTMLTextAreaElement>(null);
   const pendingSelection = useRef<[number, number] | null>(null);

   const isSubmitted = transcription?.status === 'submitted';

   const utils = trpc.useUtils();

   const createMutation = trpc.transcriptions.create.useMutation({
      onSuccess: () => utils.transcriptions.getByPage.invalidate(),
   });

   const updateMutation = trpc.transcriptions.update.useMutation({
      onSuccess: () => utils.transcriptions.getByPage.invalidate(),
   });

   const submitMutation = trpc.transcriptions.submit.useMutation({
      onSuccess: () => utils.transcriptions.getByPage.invalidate(),
   });

   // Sync textarea when transcription loads
   useEffect(() => {
      if (transcription) setTranscriptionContent(transcription.content);
   }, [transcription?.content ?? '']);

   function handleSave() {
      if (!transcription) return;
      updateMutation.mutate({
         transcriptionId: transcription.id,
         content: transcriptionContent,
      });
   }

   function handleSubmit() {
      if (!transcription) return;
      submitMutation.mutate({
         transcriptionId: transcription.id,
         content: transcriptionContent,
      });
   }

   function wrapSelection(open: string, close: string) {
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart: s, selectionEnd: e, value } = el;
      const selected = value.slice(s, e);

      setTranscriptionContent(
         value.slice(0, s) + open + selected + close + value.slice(e),
      );
      // selected text stays selected; with no selection the cursor lands between the tags
      pendingSelection.current = [
         s + open.length,
         s + open.length + selected.length,
      ];
   }

   function insertIllegible() {
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart: s, selectionEnd: e, value } = el;
      const marker = '[illegible]';

      setTranscriptionContent(value.slice(0, s) + marker + value.slice(e));
      const pos = s + marker.length;
      pendingSelection.current = [pos, pos];
   }

   useLayoutEffect(() => {
      const sel = pendingSelection.current;
      const el = textareaRef.current;
      if (!sel || !el) return;
      pendingSelection.current = null;
      el.focus();
      el.setSelectionRange(sel[0], sel[1]);
   }, [transcriptionContent]);

   return (
      <div className="space-y-3 border rounded-md p-4 h-full">
         <div className="flex gap-6 justify-between items-center">
            <div className="flex items-center gap-6">
               <h2 className="text-lg font-medium">Transcription</h2>

               {transcription && (
                  <TranscriptionToolbar
                     disabled={isSubmitted}
                     onWrap={(tag) => wrapSelection(`<${tag}>`, `</${tag}>`)}
                     onIllegible={insertIllegible}
                  />
               )}
            </div>

            {transcription?.status && (
               <p className="text-sm text-muted-foreground space-y-1 capitalize italic">
                  Status:{' '}
                  <span data-testid="transcription-status">
                     {transcription?.status}
                  </span>
               </p>
            )}
         </div>

         {!transcription ? (
            <button
               className="text-sm underline"
               onClick={() => createMutation.mutate({ pageId: pageId! })}
               disabled={createMutation.isPending}
            >
               Start transcribing
            </button>
         ) : (
            <>
               {transcription?.status === 'rejected' &&
                  transcription.rejectionReason && (
                     <p className="text-sm text-destructive mt-1">
                        Rejection reason: {transcription.rejectionReason}
                     </p>
                  )}

               <Textarea
                  className="min-h-90 font-mono resize-y disabled:opacity-60 leading-6"
                  value={transcriptionContent}
                  ref={textareaRef}
                  data-testid="transcription-content"
                  onChange={(e) => setTranscriptionContent(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Type your transcription here..."
               />

               <div className="flex gap-2 items-center">
                  {!isSubmitted && (
                     <>
                        <button
                           className="px-3 py-1 text-sm border disabled:pointer-events-none rounded hover:bg-muted disabled:opacity-50"
                           onClick={handleSave}
                           disabled={
                              updateMutation.isPending ||
                              !transcriptionContent.trim()
                           }
                        >
                           {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </button>

                        <button
                           className="px-3 py-1 text-sm bg-primary text-primary-foreground disabled:pointer-events-none rounded  hover:opacity-90 disabled:opacity-50"
                           onClick={handleSubmit}
                           disabled={
                              submitMutation.isPending ||
                              !transcriptionContent.trim()
                           }
                        >
                           {submitMutation.isPending
                              ? 'Submitting...'
                              : 'Submit'}
                        </button>

                        <Tooltip>
                           <TooltipTrigger
                              render={
                                 <button
                                    type="button"
                                    className="border border-gray-300 rounded-full px-1.5 self-start text-gray-600"
                                 >
                                    ?
                                 </button>
                              }
                           />
                           <TooltipContent>
                              <p className="max-w-44">
                                 Submitted transcriptions are reviewed by an
                                 editor before they’re published.
                              </p>
                           </TooltipContent>
                        </Tooltip>
                     </>
                  )}
               </div>
            </>
         )}
      </div>
   );
}

export default TranscriptionPanel;
