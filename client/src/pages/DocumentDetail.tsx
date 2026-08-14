import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { TranscriptionRevision } from '@shared';

const CONTRIBUTOR_ROLES = ['contributor', 'editor', 'admin'];

export default function DocumentDetail() {
   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const { data: transcription, refetch: refetchTranscription } =
      trpc.transcriptions.getByDocument.useQuery(
         { documentId: id! },
         {
            enabled:
               !!user &&
               !!user.globalRole &&
               CONTRIBUTOR_ROLES.includes(user.globalRole),
         },
      );

   const [content, setContent] = useState('');
   const [revisionsOpen, setRevisionsOpen] = useState(false);

   // Sync textarea when transcription loads
   useState(() => {
      if (transcription?.content) setContent(transcription.content);
   });

   const createMutation = trpc.transcriptions.create.useMutation({
      onSuccess: () => refetchTranscription(),
   });

   const updateMutation = trpc.transcriptions.update.useMutation();

   const submitMutation = trpc.transcriptions.submit.useMutation({
      onSuccess: () => refetchTranscription(),
   });

   const { data: revisions } = trpc.transcriptions.getRevisions.useQuery(
      { transcriptionId: transcription?.id ?? '' },
      { enabled: !!transcription && revisionsOpen },
   );

   const canTranscribe =
      !!user &&
      !!user.globalRole &&
      CONTRIBUTOR_ROLES.includes(user.globalRole);
   const isSubmitted = transcription?.status === 'submitted';

   function handleSave() {
      if (!transcription) return;
      updateMutation.mutate({ transcriptionId: transcription.id, content });
   }

   function handleSubmit() {
      if (!transcription) return;
      submitMutation.mutate({ transcriptionId: transcription.id });
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
                        value={content}
                        data-testid="transcription-content"
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSubmitted}
                        placeholder="Type your transcription here..."
                     />

                     <div className="flex gap-2 items-center">
                        {!isSubmitted && (
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
                                    submitMutation.isPending || !content.trim()
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
                              Submitted — awaiting review.
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
      </div>
   );
}
