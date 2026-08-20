import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isEditor, QueueItem } from '@folio/shared';
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function ReviewQueue() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const { data: queue, isLoading } = trpc.transcriptions.listQueue.useQuery();

   if (!isEditor(session?.user?.globalRole)) {
      navigate('/');
      return null;
   }

   if (isLoading) {
      return <p className="p-6 text-muted-foreground">Loading queue...</p>;
   }

   if (!queue || queue.length === 0) {
      return (
         <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Review Queue</h1>
            <p className="text-muted-foreground">
               No transcriptions pending review.
            </p>
         </div>
      );
   }

   return (
      <div className="p-6 max-w-4xl mx-auto">
         <h1 className="text-2xl font-semibold mb-6">Review Queue</h1>
         <div className="flex flex-col gap-4">
            {queue.map((item: QueueItem) => (
               <Card key={item.id}>
                  <CardHeader>
                     <CardTitle className="text-lg">
                        {item.documentTitle}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                     <div className="text-sm text-muted-foreground">
                        <p>
                           Contributor:{' '}
                           <span className="font-medium text-foreground">
                              {item.contributorUsername}
                           </span>
                        </p>
                        <p>
                           Submitted:{' '}
                           <span className="font-medium text-foreground">
                              {item.updatedAt
                                 ? new Date(item.updatedAt).toLocaleDateString()
                                 : '—'}
                           </span>
                        </p>
                     </div>
                     <Button
                        onClick={() =>
                           navigate(`/documents/${item.documentId}`)
                        }
                     >
                        Review
                     </Button>
                  </CardContent>
               </Card>
            ))}
         </div>
      </div>
   );
}
