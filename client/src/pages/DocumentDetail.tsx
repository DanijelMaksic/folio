import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import TranscriptionPanel from '@/components/documents/TranscriptionPanel';
import ReviewPanel from '@/components/documents/ReviewPanel';
import DocumentViewer from '@/components/documents/DocumentViewer';

export default function DocumentDetail() {
   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const canTranscribe = isContributor(user?.globalRole);

   const { data: transcription } = trpc.transcriptions.getByDocument.useQuery(
      { documentId: id! },
      {
         enabled: canTranscribe,
      },
   );

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

         <div className="grid grid-cols-2 gap-4">
            <DocumentViewer doc={doc} />

            {canTranscribe && id && (
               <TranscriptionPanel
                  transcription={transcription}
                  id={id}
                  doc={doc}
               />
            )}
         </div>

         {isEditor(session?.user?.globalRole) &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <ReviewPanel submittedTranscription={submittedTranscription} />
            )}
      </div>
   );
}
