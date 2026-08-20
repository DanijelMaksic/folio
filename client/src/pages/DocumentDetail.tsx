import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor, TranscriptionRevision } from '@shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function DocumentDetail() {
   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const canTranscribe = isContributor(user?.globalRole);

   const { data: transcription } = trpc.transcriptions.getByDocument.useQuery(
      { documentId: id! },
      {
         enabled: canTranscribe,
      },
   );

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByDocument.useQuery(
         {
            documentId: id!,
         },
         {
            enabled: isEditor(user?.globalRole),
         },
      );

   const [transcriptionContent, setTranscriptionContent] = useState('');
   const [rejectionReason, setRejectionReason] = useState('');
   const [revisionsOpen, setRevisionsOpen] = useState(false);

   const utils = trpc.useUtils();

   // Sync textarea when transcription loads
   useEffect(() => {
      if (transcription?.content)
         setTranscriptionContent(transcription.content);
   }, [transcription?.content]);

   const createMutation = trpc.transcriptions.create.useMutation({
      onSuccess: () => utils.transcriptions.getByDocument.invalidate(),
   });

   const updateMutation = trpc.transcriptions.update.useMutation();

   const submitMutation = trpc.transcriptions.submit.useMutation({
      onSuccess: () => utils.transcriptions.getByDocument.invalidate(),
   });

   const approveMutation = trpc.transcriptions.approve.useMutation({
      onSuccess: () => {
         utils.transcriptions.getByDocument.invalidate();
         utils.transcriptions.getSubmittedByDocument.invalidate();
      },
   });

   const rejectMutation = trpc.transcriptions.reject.useMutation({
      onSuccess: () => {
         utils.transcriptions.getByDocument.invalidate();
         utils.transcriptions.getSubmittedByDocument.invalidate();
      },
   });

   const { data: revisions } = trpc.transcriptions.getRevisions.useQuery(
      { transcriptionId: transcription?.id ?? '' },
      { enabled: !!transcription && revisionsOpen },
   );

   const isSubmitted = transcription?.status === 'submitted';
   const isApproved = transcription?.status === 'approved';
   const isLocked = isSubmitted || isApproved;

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

   function handleApprove() {
      if (!submittedTranscription) return;
      approveMutation.mutate({ transcriptionId: submittedTranscription.id });
   }

   function handleReject() {
      if (!submittedTranscription) return;
      rejectMutation.mutate({
         transcriptionId: submittedTranscription.id,
         reason: rejectionReason,
      });
   }

   if (isLoading) return <p>Loading...</p>;
   if (!doc) return <p>Document not found.</p>;

   return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
         <div>
            <h1 className="text-2xl font-semibold">{doc.title}</h1>
            {doc.description && (
               <p className="text-muted-foreground mt-1">{doc.description}</p>
            )}
         </div>

         <img
            src={doc.cloudinaryUrl}
            alt={doc.title}
            className="w-full rounded-md border object-contain max-h-[70vh]"
         />

         <div className="text-sm text-muted-foreground space-y-1">
            <p>Status: {doc.status}</p>
            <p>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
         </div>

         {transcription?.status === 'rejected' &&
            transcription.rejectionReason && (
               <p className="text-sm text-destructive mt-1">
                  Rejection reason: {transcription.rejectionReason}
               </p>
            )}

         {canTranscribe && (
            <div className="space-y-3 border rounded-md p-4">
               <h2 className="text-lg font-medium">Transcription</h2>

               {!transcription ? (
                  <button
                     className="text-sm underline"
                     onClick={() => createMutation.mutate({ documentId: id! })}
                     disabled={createMutation.isPending}
                  >
                     Start transcribing
                  </button>
               ) : (
                  <>
                     <textarea
                        className="w-full min-h-50 border rounded p-2 text-sm font-mono resize-y disabled:opacity-60"
                        value={transcriptionContent}
                        data-testid="transcription-content"
                        onChange={(e) =>
                           setTranscriptionContent(e.target.value)
                        }
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
                                 {updateMutation.isPending
                                    ? 'Saving...'
                                    : 'Save'}
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
         )}

         {isEditor(session?.user?.globalRole) &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <div className="mt-6 border rounded-lg p-4 space-y-4">
                  <h2 className="font-semibold">Review Transcription</h2>
                  <p className="text-sm text-muted-foreground">
                     Submitted by{' '}
                     <span className="font-medium text-foreground">
                        {submittedTranscription.user.username}
                     </span>
                  </p>
                  <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
                     {submittedTranscription.content}
                  </div>
                  <div
                     data-testid="review-status"
                     className="text-sm text-muted-foreground"
                  >
                     Status: {submittedTranscription.status}
                  </div>
                  <Button
                     onClick={handleApprove}
                     disabled={approveMutation.isPending}
                  >
                     Approve
                  </Button>
                  <div className="space-y-2">
                     <Textarea
                        placeholder="Rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                     />
                     <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={
                           rejectMutation.isPending || !rejectionReason.trim()
                        }
                     >
                        Reject
                     </Button>
                  </div>
               </div>
            )}
      </div>
   );
}
