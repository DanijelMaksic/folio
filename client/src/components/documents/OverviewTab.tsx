import PageViewer from '@/components/documents/PageViewer';
import TranscriptionPlaceholder from '@/components/documents/TranscriptionPlaceholder';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { useParams } from 'react-router-dom';

function OverviewTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const placeholderType = !user
      ? 'not-signed-in'
      : isContributor(user.globalRole)
        ? 'contributor'
        : 'viewer';

   const { data: approvedTranscription } =
      trpc.transcriptions.getApprovedByPage.useQuery(
         { pageId: page?.id! },
         { enabled: !!page?.id },
      );

   return (
      <div className="grid grid-cols-2 gap-4 items-start">
         <div className="sticky top-24">
            <PageViewer page={page} />
         </div>

         {approvedTranscription ? (
            <div className="flex flex-col gap-3 border rounded-md p-4 h-full">
               <div className="flex gap-6 justify-between items-center">
                  <h2 className="text-lg font-medium">Transcription</h2>

                  {approvedTranscription?.status &&
                     user?.id === approvedTranscription.userId && (
                        <p className="text-sm text-muted-foreground space-y-1 capitalize italic">
                           Status:{' '}
                           <span data-testid="transcription-status">
                              {approvedTranscription?.status}
                           </span>
                        </p>
                     )}
               </div>

               {approvedTranscription.content === '' ? (
                  <div className="flex flex-1 items-center justify-center">
                     <span className="text-muted-foreground text-lg">
                        This page is blank
                     </span>
                  </div>
               ) : (
                  <p className="text-[1rem] whitespace-pre-wrap leading-7">
                     <TranscriptionText
                        className="text-[1rem] leading-7"
                        content={approvedTranscription.content}
                     />
                  </p>
               )}
            </div>
         ) : (
            <TranscriptionPlaceholder type={placeholderType} />
         )}
      </div>
   );
}

export default OverviewTab;
