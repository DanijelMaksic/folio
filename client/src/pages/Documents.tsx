import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Document, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { DocumentCard } from '@/components/documents/DocumentCard.js';

export default function Documents() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const { data, isLoading } = trpc.documents.list.useQuery({
      page: 1,
      limit: 20,
   });

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>
            {canTranscribe && (
               <Button onClick={() => navigate('/documents/upload')}>
                  Upload
               </Button>
            )}
         </div>

         {!data?.length ? (
            <p className="text-muted-foreground">No documents yet.</p>
         ) : (
            <div className="grid grid-cols-3 gap-4">
               {data?.map((doc: Document) => (
                  <DocumentCard doc={doc} key={doc.id} />
               ))}
            </div>
         )}
      </div>
   );
}
