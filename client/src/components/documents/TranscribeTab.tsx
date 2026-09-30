import DocumentViewer from '@/components/documents/DocumentViewer';
import TranscriptionPanel from '@/components/documents/TranscriptionPanel';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { Navigate, useParams } from 'react-router-dom';

function TranscribeTab() {
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
         enabled: canTranscribe && !!page?.id,
      },
   );

   if (isPending) return null;

   if (!session) return <Navigate to="/login" replace />;

   return (
      <div className="grid grid-cols-2 gap-4">
         <DocumentViewer page={page} />

         {id && (
            <TranscriptionPanel
               transcription={transcription}
               pageId={page?.id}
            />
         )}
      </div>
   );
}

export default TranscribeTab;
