import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Transcription } from '@shared';
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import TranscriptionToolbar from '@/components/documents/TranscriptionToolbar';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { useParams } from 'react-router-dom';
import GuestTranscriptionPanel from '@/components/documents/GuestTranscriptionPanel';
import { useViewerStore } from '@/store/useViewerStore';
import SubmitModal from '@/components/documents/SubmitModal';
import TranscriptionPanelActions from '@/components/documents/TranscriptionPanelActions';
import TranscriptionPanelStatus from '@/components/documents/TranscriptionPanelStatus';

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
   const [isSubmitOpen, setIsSubmitOpen] = useState(false);

   const { focusMode, imagePosition } = useViewerStore();

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
      setIsSubmitOpen(false);
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

   function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (isSubmitted || isBlank) return;

      const key = e.key.toLowerCase();

      if (e.shiftKey && key === 'x') {
         e.preventDefault();
         wrapSelection('<del>', '</del>');
         return;
      }

      if (key === 's') {
         e.preventDefault();
         if (hasContent && !updateMutation.isPending) handleSave();
      } else if (key === 'i') {
         e.preventDefault();
         wrapSelection('<i>', '</i>');
      } else if (key === 'u') {
         e.preventDefault();
         wrapSelection('<u>', '</u>');
      } else if (key === 'enter') {
         e.preventDefault();
         setIsSubmitOpen(true);
      } else if (key === 'p') {
         e.preventDefault();
         setPreview(true);
      }
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

   const isHorizontal = imagePosition === 'left' || imagePosition === 'right';

   if (!canTranscribe)
      return (
         <GuestTranscriptionPanel
            onIllegible={insertIllegible}
            wrapSelection={(tag) => wrapSelection(`<${tag}>`, `</${tag}>`)}
            approvedTranscriptionContent={approvedTranscription?.content!}
            transcriptionContent={transcriptionContent}
            isHorizontal={isHorizontal}
         />
      );

   return (
      <div
         className={`border rounded-md px-4 py-3 flex-1 h-full flex flex-col gap-3 ${
            focusMode ? 'min-h-0' : ''
         }`}
      >
         <div className="flex gap-6 justify-between items-center shrink-0">
            <div className="flex items-center gap-6">
               <h2 className="text-lg font-medium pt-1">Transcription</h2>

               {transcription && !preview && (
                  <TranscriptionToolbar
                     disabled={isSubmitted || isBlank}
                     onWrap={(tag) => wrapSelection(`<${tag}>`, `</${tag}>`)}
                     onIllegible={insertIllegible}
                  />
               )}

               {transcription?.status && !preview && !isHorizontal && (
                  <TranscriptionPanelStatus status={transcription.status} />
               )}
            </div>

            {!isHorizontal && (
               <TranscriptionPanelActions
                  isSubmitted={isSubmitted}
                  preview={preview}
                  isBlank={isBlank}
                  setIsBlank={setIsBlank}
                  setPreview={setPreview}
                  isSaving={updateMutation.isPending}
                  transcriptionContent={transcriptionContent}
                  handleSave={handleSave}
                  hasContent={hasContent}
                  setIsSubmitOpen={setIsSubmitOpen}
                  isSubmitting={submitMutation.isPending}
               />
            )}

            {transcription?.status && isHorizontal && (
               <TranscriptionPanelStatus status={transcription.status} />
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
                     <p className="text-sm text-destructive border border-destructive px-4 py-2 rounded-md shrink-0 max-h-24 overflow-y-auto">
                        {' '}
                        Rejection reason: {transcription.rejectionReason}
                     </p>
                  )}

               {preview ? (
                  <div className="relative flex-1 min-h-90 border rounded-md">
                     <div className="absolute inset-0 overflow-y-auto px-6 py-3">
                        <TranscriptionText
                           className="text-[1rem] leading-7 font-serif"
                           content={transcriptionContent}
                        />
                     </div>
                  </div>
               ) : (
                  <Textarea
                     className={`font-serif leading-7 text-[1rem]! disabled:opacity-60 disabled:caret-transparent flex-1 px-6 py-3 field-sizing-fixed! ${
                        focusMode
                           ? 'min-h-0 resize-none overflow-y-auto'
                           : 'min-h-90 resize-y'
                     }`}
                     value={transcriptionContent}
                     onKeyDown={handleKeyDown}
                     ref={textareaRef}
                     readOnly={isBlank}
                     data-testid="transcription-content"
                     onChange={(e) => setTranscriptionContent(e.target.value)}
                     disabled={isSubmitted || isBlank}
                     placeholder={
                        isBlank
                           ? 'This page is marked as blank. Uncheck "Mark as blank" to write a transcription.'
                           : 'Type your transcription here...'
                     }
                  />
               )}

               {isHorizontal && (
                  <TranscriptionPanelActions
                     isSubmitted={isSubmitted}
                     preview={preview}
                     isBlank={isBlank}
                     setIsBlank={setIsBlank}
                     setPreview={setPreview}
                     isSaving={updateMutation.isPending}
                     transcriptionContent={transcriptionContent}
                     handleSave={handleSave}
                     hasContent={hasContent}
                     setIsSubmitOpen={setIsSubmitOpen}
                     isSubmitting={submitMutation.isPending}
                  />
               )}
            </>
         )}

         {isSubmitOpen && (
            <SubmitModal
               onSubmit={handleSubmit}
               onClose={() => setIsSubmitOpen(false)}
               isPending={submitMutation.isPending}
               hasContent={hasContent}
            />
         )}
      </div>
   );
}

export default TranscriptionPanel;
