import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor, TranscriptionRevision } from '@shared';
import { Navigate, useParams } from 'react-router-dom';

function RevisionHistoryTab() {
   const { id } = useParams<{ id: string }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const canTranscribe = isContributor(user?.globalRole);

   const { data: transcription } = trpc.transcriptions.getByDocument.useQuery(
      { documentId: id! },
      {
         enabled: canTranscribe,
      },
   );

   const { data: revisions } = trpc.transcriptions.getRevisions.useQuery(
      { transcriptionId: transcription?.id ?? '' },
      { enabled: !!transcription },
   );

   if (isPending) return null;

   if (!session) return <Navigate to="/login" replace />;

   return (
      <div>
         <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {revisions?.length === 0 && (
               <li className="text-md text-muted-foreground">
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
      </div>
   );
}

export default RevisionHistoryTab;
