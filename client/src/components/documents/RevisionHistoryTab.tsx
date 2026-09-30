import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { Navigate, useParams } from 'react-router-dom';

function RevisionHistoryTab() {
   const { id, pageNumber } = useParams<{ id: string; pageNumber: string }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const canTranscribe = isContributor(user?.globalRole);

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: id!,
      pageNumber: Number(pageNumber),
   });

   const { data: transcription } = trpc.transcriptions.getByPage.useQuery(
      { pageId: page?.id! },
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
            {!revisions && (
               <li className="text-md text-muted-foreground">
                  No revisions yet.
               </li>
            )}
            {revisions?.map((rev) => (
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
