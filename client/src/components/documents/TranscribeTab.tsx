import PageViewer from '@/components/documents/PageViewer';
import ResizeHandle from '@/components/documents/ResizeHandle';
import TranscriptionPanel from '@/components/documents/TranscriptionPanel';
import { useImageLayout } from '@/hooks/useImageLayout';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { useParams } from 'react-router-dom';

function TranscribeTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session, isPending } = useSession();
   const user = session?.user;

   const {
      grid,
      gridRef,
      gridStyle,
      imageCell,
      panelCell,
      showHandle,
      handleProps,
   } = useImageLayout();

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
      <div ref={gridRef} style={gridStyle} className={grid}>
         <div className={imageCell}>
            <PageViewer page={page} />
         </div>

         {showHandle && <ResizeHandle {...handleProps} />}

         {documentId && (
            <div className={panelCell}>
               <TranscriptionPanel
                  transcription={transcription}
                  pageId={page?.id}
                  canTranscribe={canTranscribe}
               />
            </div>
         )}
      </div>
   );
}

export default TranscribeTab;
