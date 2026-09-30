import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isEditor } from '@folio/shared';
import QueueItem from '@/pages/QueueItem';

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
            {queue.map((item) => (
               <QueueItem key={item.id} item={item} />
            ))}
         </div>
      </div>
   );
}
