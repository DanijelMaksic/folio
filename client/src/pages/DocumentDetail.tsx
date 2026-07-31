import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export default function DocumentDetail() {
   const { id } = useParams<{ id: string }>();
   const { data: doc, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   if (isLoading) return <p>Loading...</p>;
   if (!doc) return <p>Document not found.</p>;

   return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
         <div>
            <h1 className="text-2xl font-semibold">{doc.title}</h1>
            {doc.description && (
               <p className="text-muted-foreground mt-1">{doc.description}</p>
            )}
         </div>

         <img
            src={doc.cloudinaryUrl}
            alt={doc.title}
            className="w-full rounded-md border object-contain max-h-[70vh]"
         />

         <div className="text-sm text-muted-foreground space-y-1">
            <p>Status: {doc.status}</p>
            <p>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
         </div>
      </div>
   );
}
