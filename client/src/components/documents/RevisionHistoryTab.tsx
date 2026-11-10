import TranscriptionText from '@/components/documents/TranscriptionText';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { Link, useParams } from 'react-router-dom';

function RevisionHistoryTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const canTranscribe = isContributor(user?.globalRole);

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
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

   if (!session)
      return (
         <div className="text-[1rem] mt-2">
            <Link to="/sign-in" className="hover:underline font-semibold">
               Sign in
            </Link>{' '}
            <span>to see your transcription history</span>
         </div>
      );

   return (
      <ul className="mt-2 space-y-2 max-h-96 overflow-y-auto">
         {!revisions?.length && (
            <li className="text-md text-muted-foreground">No revisions yet.</li>
         )}
         {revisions?.map((rev) => (
            <li key={rev.id} className="text-xs border rounded p-2 space-y-1">
               <p className="text-muted-foreground">
                  {new Date(rev.savedAt).toLocaleString()}
               </p>

               {rev.isBlank ? (
                  <span className="text-muted-foreground text-sm">
                     Blank page
                  </span>
               ) : (
                  <p
                     data-testid="transcription-revision"
                     className="font-mono text-sm whitespace-pre-wrap"
                  >
                     <TranscriptionText
                        data-testid="transcription-revision"
                        content={rev.content}
                        className="..."
                     />
                  </p>
               )}
            </li>
         ))}
      </ul>
   );
}

export default RevisionHistoryTab;
