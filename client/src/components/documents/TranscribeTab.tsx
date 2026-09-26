import DocumentViewer from '@/components/documents/DocumentViewer';
import TranscriptionPanel from '@/components/documents/TranscriptionPanel';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { Navigate, useParams } from 'react-router-dom';

function TranscribeTab() {
   const { id } = useParams<{ id: string }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const canTranscribe = isContributor(user?.globalRole);

   const { data: transcription } = trpc.transcriptions.getByPage.useQuery(
      { pageId: id! },
      {
         enabled: canTranscribe,
      },
   );

   const { data: page } = trpc.pages.getById.useQuery({
      pageId: id!,
   });

   if (isPending) return null;

   if (!session) return <Navigate to="/login" replace />;

   return (
      <div className="grid grid-cols-2 gap-4">
         <DocumentViewer page={page} />

         {id && (
            <TranscriptionPanel transcription={transcription} pageId={id} />
         )}
      </div>
   );
}

export default TranscribeTab;
