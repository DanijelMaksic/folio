import { Outlet, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import ReviewPanel from '@/components/documents/ReviewPanel';
import DocumentViewer from '@/components/documents/DocumentViewer';
import DocumentTabs from '@/components/documents/DocumentTabs';

export default function DocumentDetail() {
   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;

   const canTranscribe = isContributor(user?.globalRole);

   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByDocument.useQuery(
         {
            documentId: id!,
         },
         {
            enabled: isEditor(user?.globalRole),
         },
      );

   if (isLoading) return <p>Loading...</p>;

   if (!doc) return <p>Document not found.</p>;

   return (
      <div className="max-w-full p-6 space-y-6 mx-12">
         <div>
            <h1 className="text-2xl font-semibold">{doc.title}</h1>
            {doc.description && (
               <p className="text-muted-foreground mt-1">{doc.description}</p>
            )}
         </div>

         {canTranscribe && <DocumentTabs />}

         <Outlet />

         {isEditor(session?.user?.globalRole) &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <ReviewPanel submittedTranscription={submittedTranscription} />
            )}
      </div>
   );
}
