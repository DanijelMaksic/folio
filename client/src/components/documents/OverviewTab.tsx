import PageViewer from '@/components/documents/PageViewer';
import TranscriptionPlaceholder from '@/components/documents/TranscriptionPlaceholder';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { useViewerStore } from '@/store/useViewerStore';
import { isContributor } from '@shared';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

function OverviewTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { focusMode } = useViewerStore();

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

         {approvedTranscription ? (
            <div className="flex flex-col gap-3 border rounded-md p-4 h-full overflow-y-auto">
               <div className="flex gap-6 justify-between items-center">
                  <h2 className="text-lg font-medium">Transcription</h2>

                  {user?.id === approvedTranscription.userId ? (
                     <p className="text-sm space-y-1 capitalize bg-gray-900 rounded-md text-white px-3 py-1">
                        Your transcription
                     </p>
                  ) : (
                     <div>
                        <span>Transcribed by : </span>
                        <Link
                           to={`${window.location.origin}/users/${approvedTranscription.username}`}
                           className="font-semibold hover:underline"
                        >
                           {approvedTranscription.username}
                        </Link>
                     </div>
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
