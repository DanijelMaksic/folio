import PageViewer from '@/components/documents/PageViewer';
import TranscriptionPanel from '@/components/documents/TranscriptionPanel';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { useViewerStore } from '@/store/useViewerStore';
import { isContributor } from '@shared';
import { useParams } from 'react-router-dom';

function TranscribeTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const { focusMode } = useViewerStore();

   const canTranscribe = isContributor(user?.globalRole);

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const { data: transcription } = trpc.transcriptions.getByPage.useQuery(
      { pageId: page?.id! },
      {
         enabled: canTranscribe && !!page?.id,
      },
   );

   if (isPending) return null;

   return (
      <div
         className={`grid grid-cols-2 gap-4 ${
            focusMode
               ? 'h-full min-h-0 grid-rows-[minmax(0,1fr)]'
               : 'items-start'
         }`}
      >
         <div className={focusMode ? 'h-full min-h-0' : 'sticky top-24'}>
            <PageViewer page={page} />
         </div>

         {documentId && (
            <TranscriptionPanel
               transcription={transcription}
               pageId={page?.id}
               canTranscribe={canTranscribe}
            />
         )}
      </div>
   );
}

export default TranscribeTab;
