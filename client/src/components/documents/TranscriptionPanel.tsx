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
import { Checkbox } from '@/components/ui/checkbox';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { useParams } from 'react-router-dom';
import GuestTranscriptionPanel from '@/components/documents/GuestTranscriptionPanel';
import { useViewerStore } from '@/store/useViewerStore';

function TranscriptionPanel({
   canTranscribe,
   transcription,
   pageId,
}: {
   canTranscribe: boolean;
   transcription?: Transcription;
   pageId?: string;
}) {
   const [transcriptionContent, setTranscriptionContent] = useState('');
   const [isBlank, setIsBlank] = useState(false);
   const [preview, setPreview] = useState(false);

   const { focusMode } = useViewerStore();

   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

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

   const { data: approvedTranscription } =
      trpc.transcriptions.getApprovedByPage.useQuery(
         { pageId: page?.id! },
         { enabled: !!page?.id },
      );

   // Sync textarea when transcription loads
   useEffect(() => {
      if (transcription) {
         setTranscriptionContent(transcription.content);
         setIsBlank(transcription.isBlank);
      } else {
         setTranscriptionContent('');
         setIsBlank(false);
         setPreview(false);
      }
   }, [
      transcription?.id,
      transcription?.content ?? '',
      transcription?.isBlank,
   ]);

   function handleSave() {
      if (!transcription) return;
      updateMutation.mutate({
         transcriptionId: transcription.id,
         content: transcriptionContent,
         isBlank: isBlank,
      });
   }

   function handleSubmit() {
      if (!transcription) return;
      submitMutation.mutate({
         transcriptionId: transcription.id,
         content: transcriptionContent,
         isBlank: isBlank,
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

   const hasContent = isBlank || !!transcriptionContent.trim();

   if (!canTranscribe)
      return (
         <GuestTranscriptionPanel
            onIllegible={insertIllegible}
            wrapSelection={(tag) => wrapSelection(`<${tag}>`, `</${tag}>`)}
            transcription={transcription!}
            approvedTranscriptionContent={approvedTranscription?.content!}
            transcriptionContent={transcriptionContent}
         />
      );

   return (
      <div
         className={`border rounded-md px-4 py-3 h-full ${
            focusMode ? 'flex flex-col gap-3 min-h-0' : 'space-y-3'
         }`}
      >
         {' '}
         <div className="flex gap-6 justify-between items-center">
            <div className="flex items-center gap-6">
               <h2 className="text-lg font-medium pt-1">Transcription</h2>

               {transcription && !preview && (
                  <TranscriptionToolbar
                     disabled={isSubmitted || isBlank}
                     onWrap={(tag) => wrapSelection(`<${tag}>`, `</${tag}>`)}
                     onIllegible={insertIllegible}
                  />
               )}
            </div>

            {transcription?.status && (
               <div className="text-sm text-muted-foreground capitalize flex gap-2">
                  <div className="italic self-end">
                     <span>Status: </span>
                     <span data-testid="transcription-status">
                        {transcription?.status}
                     </span>
                  </div>

                  {transcription?.status === 'submitted' && (
                     <Tooltip>
                        <TooltipTrigger
                           render={
                              <button
                                 type="button"
                                 className="border border-gray-300 rounded-full px-2 text-gray-600"
                              >
                                 ?
                              </button>
                           }
                        />
                        <TooltipContent>
                           <p className="max-w-44">
                              Submitted transcriptions are reviewed by an editor
                              before they’re published.
                           </p>
                        </TooltipContent>
                     </Tooltip>
                  )}
               </div>
            )}
         </div>
         {!transcription ? (
            <button
               className="text-sm underline"
               onClick={() => createMutation.mutate({ pageId: pageId! })}
               disabled={createMutation.isPending}
            >
               {approvedTranscription
                  ? 'Suggest a correction'
                  : 'Start transcribing'}
            </button>
         ) : (
            <>
               {transcription?.status === 'rejected' &&
                  transcription.rejectionReason && (
                     <p className="text-sm text-destructive mt-1 border border-destructive px-4 py-2 rounded-md">
                        Rejection reason: {transcription.rejectionReason}
                     </p>
                  )}

               {preview ? (
                  <div className="flex flex-col gap-3 border rounded-md p-4 min-h-90">
                     <p className="text-[1rem] whitespace-pre-wrap leading-7">
                        <TranscriptionText content={transcriptionContent} />
                     </p>
                  </div>
               ) : (
                  <Textarea
                     className={`font-mono resize-y disabled:opacity-60 leading-6 disabled:caret-transparent ${
                        focusMode
                           ? 'flex-1 min-h-0 resize-none overflow-y-auto field-sizing-fixed'
                           : 'min-h-90'
                     }`}
                     value={transcriptionContent}
                     ref={textareaRef}
                     readOnly={isBlank}
                     data-testid="transcription-content"
                     onChange={(e) => setTranscriptionContent(e.target.value)}
                     disabled={isSubmitted || isBlank}
                     placeholder="Type your transcription here..."
                  />
               )}

               <div className="flex gap-2 items-center justify-end">
                  {!isSubmitted && (
                     <>
                        {!preview && (
                           <div className="flex items-center gap-2 mr-4">
                              <span>Mark as blank</span>
                              <Checkbox
                                 onCheckedChange={(v) => setIsBlank(v === true)}
                                 className="border-gray-400"
                                 id="blank-checkbox"
                                 name="blank-checkbox"
                                 checked={isBlank}
                              />
                           </div>
                        )}

                        <button
                           className="px-3 py-1 text-sm border disabled:pointer-events-none rounded hover:bg-muted disabled:opacity-50"
                           onClick={() => setPreview(!preview)}
                           disabled={
                              updateMutation.isPending ||
                              !transcriptionContent.trim() ||
                              isBlank
                           }
                        >
                           {preview ? 'Edit' : 'Preview'}
                        </button>

                        <button
                           className="px-3 py-1 text-sm border disabled:pointer-events-none rounded hover:bg-muted disabled:opacity-50"
                           onClick={handleSave}
                           disabled={updateMutation.isPending || !hasContent}
                        >
                           {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </button>

                        <button
                           className="px-3 py-1 text-sm bg-primary text-primary-foreground disabled:pointer-events-none rounded  hover:opacity-90 disabled:opacity-50"
                           onClick={handleSubmit}
                           disabled={submitMutation.isPending || !hasContent}
                        >
                           {submitMutation.isPending
                              ? 'Submitting...'
                              : 'Submit'}
                        </button>
                     </>
                  )}
               </div>
            </>
         )}
      </div>
   );
}

export default TranscriptionPanel;
