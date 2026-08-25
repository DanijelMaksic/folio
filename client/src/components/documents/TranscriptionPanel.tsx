import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Document, Transcription, TranscriptionRevision } from '@shared';
import { useEffect, useState } from 'react';

function TranscriptionPanel({
   transcription,
   id: docId,
   doc,
}: {
   transcription: Transcription;
   id: string;
   doc: Document;
}) {
   const [transcriptionContent, setTranscriptionContent] = useState('');
   const [revisionsOpen, setRevisionsOpen] = useState(false);

   const isSubmitted = transcription?.status === 'submitted';
   const isApproved = transcription?.status === 'approved';
   const isLocked = isSubmitted || isApproved;

   const utils = trpc.useUtils();

   const createMutation = trpc.transcriptions.create.useMutation({
      onSuccess: () => utils.transcriptions.getByDocument.invalidate(),
   });

   const updateMutation = trpc.transcriptions.update.useMutation();

   const submitMutation = trpc.transcriptions.submit.useMutation({
      onSuccess: () => utils.transcriptions.getByDocument.invalidate(),
   });

   // Sync textarea when transcription loads
   useEffect(() => {
      if (transcription?.content)
         setTranscriptionContent(transcription.content);
   }, [transcription?.content]);

   const { data: revisions } = trpc.transcriptions.getRevisions.useQuery(
      { transcriptionId: transcription?.id ?? '' },
      { enabled: !!transcription && revisionsOpen },
   );

   function handleSave() {
      if (!transcription) return;
      updateMutation.mutate({
         transcriptionId: transcription.id,
         content: transcriptionContent,
      });
   }

   function handleSubmit() {
      if (!transcription) return;
      submitMutation.mutate({ transcriptionId: transcription.id });
   }

   return (
      <div className="space-y-3 border rounded-md p-4">
         <div className="flex gap-6 justify-between items-center">
            <h2 className="text-lg font-medium">Transcription</h2>

            <p className="text-sm text-muted-foreground space-y-1 capitalize italic">
               Status: {doc.status}
            </p>
         </div>

         {!transcription ? (
            <button
               className="text-sm underline"
               onClick={() => createMutation.mutate({ documentId: docId! })}
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
                  className="min-h-50 text-sm font-mono resize-y disabled:opacity-60"
                  value={transcriptionContent}
                  data-testid="transcription-content"
                  onChange={(e) => setTranscriptionContent(e.target.value)}
                  disabled={isLocked}
                  placeholder="Type your transcription here..."
               />

               <div className="flex gap-2 items-center">
                  {!isLocked && (
                     <>
                        <button
                           className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
                           onClick={handleSave}
                           disabled={updateMutation.isPending}
                        >
                           {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                           className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
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
                     </>
                  )}
                  {isSubmitted && (
                     <p className="text-sm text-muted-foreground">
                        Submitted — awaiting review
                     </p>
                  )}
                  {isApproved && (
                     <p className="text-sm text-muted-foreground">
                        Transcription approved
                     </p>
                  )}
                  <span
                     data-testid="transcription-status"
                     className="ml-auto text-xs text-muted-foreground capitalize"
                  >
                     {transcription.status}
                  </span>
               </div>

               <div>
                  <button
                     className="text-xs text-muted-foreground underline"
                     onClick={() => setRevisionsOpen((o) => !o)}
                  >
                     {revisionsOpen ? 'Hide' : 'Show'} revision history
                  </button>

                  {revisionsOpen && (
                     <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {revisions?.length === 0 && (
                           <li className="text-xs text-muted-foreground">
                              No revisions yet.
                           </li>
                        )}
                        {revisions?.map((rev: TranscriptionRevision) => (
                           <li
                              key={rev.id}
                              className="text-xs border rounded p-2 space-y-1"
                           >
                              <p className="text-muted-foreground">
                                 {new Date(rev.savedAt).toLocaleString()}
                              </p>
                              <p
                                 data-testid="transcription-revision"
                                 className="font-mono whitespace-pre-wrap"
                              >
                                 {rev.content}
                              </p>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>
            </>
         )}
      </div>
   );
}

export default TranscriptionPanel;
