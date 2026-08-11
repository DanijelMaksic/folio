import { trpc } from '../lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Document } from '@shared';

export default function Documents() {
   const navigate = useNavigate();
   const { data, isLoading } = trpc.documents.list.useQuery({
      page: 1,
      limit: 20,
   });

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>
            <Button onClick={() => navigate('/documents/upload')}>
               Upload
            </Button>
         </div>

         {!data?.length ? (
            <p className="text-muted-foreground">No documents yet.</p>
         ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               {data.map((doc: Document) => (
                  <Card
                     key={doc.id}
                     className="cursor-pointer hover:shadow-md transition-shadow"
                     onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                     <CardHeader>
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                     </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground">
                           {doc.description ?? 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                           {doc.status}
                        </p>
                     </CardContent>
                  </Card>
               ))}
            </div>
         )}
      </div>
   );
}
