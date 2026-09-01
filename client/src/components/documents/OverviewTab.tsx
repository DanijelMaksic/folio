import DocumentViewer from '@/components/documents/DocumentViewer';
import TranscriptionPlaceholder from '@/components/documents/TranscriptionPlaceholder';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';
import { useParams } from 'react-router-dom';

function OverviewTab() {
   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const placeholderType = !user
      ? 'not-logged-in'
      : isContributor(user.globalRole)
        ? 'contributor'
        : 'viewer';

   const { data: approvedTranscription } =
      trpc.transcriptions.getApprovedByDocument.useQuery({ documentId: id! });

   return (
      <div className="grid grid-cols-2 gap-4">
         <DocumentViewer doc={doc} />

         {approvedTranscription ? (
            <div className="space-y-3 border rounded-md p-4">
               <div className="flex gap-6 justify-between items-center">
                  <h2 className="text-lg font-medium">Transcription</h2>

                  <p className="text-sm text-muted-foreground space-y-1 capitalize italic">
                     Status: {approvedTranscription.status}
                  </p>
               </div>
               <p>{approvedTranscription.content}</p>
            </div>
         ) : (
            <TranscriptionPlaceholder type={placeholderType} />
         )}

         {doc.description && (
            <div className="flex flex-col gap-2 my-6">
               <h2 className="text-xl font-bold">Description</h2>
               <p className="text-muted-foreground text-md">
                  {doc.description}
               </p>
            </div>
         )}
      </div>
   );
}

export default OverviewTab;
