import PageViewer from '@/components/documents/PageViewer';
import TranscriptionPlaceholder from '@/components/documents/TranscriptionPlaceholder';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { useImageLayout } from '@/hooks/useImageLayout';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { Link, useParams } from 'react-router-dom';

function OverviewTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { grid, imageCell } = useImageLayout();

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const placeholderType =
      user && isContributor(user.globalRole) ? 'contributor' : 'not-signed-in';

   const { data: approvedTranscription } =
      trpc.transcriptions.getApprovedByPage.useQuery(
         { pageId: page?.id! },
         { enabled: !!page?.id },
      );

   return (
      <div className={`grid gap-4 ${grid}`}>
         <div className={imageCell}>
            <PageViewer page={page} />
         </div>

         {approvedTranscription ? (
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-md border p-4">
               <div className="flex shrink-0 items-center justify-between gap-6">
                  <h2 className="text-lg font-medium">Transcription</h2>

                  {user?.id === approvedTranscription.userId ? (
                     <p className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white">
                        Your transcription
                     </p>
                  ) : (
                     <div>
                        <span>Transcribed by: </span>
                        {approvedTranscription.username ? (
                           <Link
                              to={`/users/${approvedTranscription.username}`}
                              className="font-semibold hover:underline"
                           >
                              {approvedTranscription.username}
                           </Link>
                        ) : (
                           <span className="text-muted-foreground">
                              Deleted user
                           </span>
                        )}
                     </div>
                  )}
               </div>

               {approvedTranscription.isBlank ? (
                  <div className="flex flex-1 items-center justify-center">
                     <span className="text-lg text-muted-foreground">
                        This page is blank
                     </span>
                  </div>
               ) : (
                  <TranscriptionText
                     className="text-[1rem] leading-7"
                     content={approvedTranscription.content}
                  />
               )}
            </div>
         ) : (
            <TranscriptionPlaceholder type={placeholderType} />
         )}
      </div>
   );
}

export default OverviewTab;
