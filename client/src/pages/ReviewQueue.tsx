import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isEditor } from '@folio/shared';
import QueueItem from '@/pages/QueueItem';
import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

export default function ReviewQueue() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const [sort, setSort] = useState<'oldest' | 'newest'>('oldest');

   const { data: queue, isLoading } = trpc.transcriptions.listQueue.useQuery(
      { sort },
      { placeholderData: (prev) => prev },
   );

   if (!isEditor(session?.user?.globalRole)) {
      navigate('/');
      return <div>403 Forbidden</div>;
   }

   if (isLoading) {
      return <p className="p-6 text-muted-foreground">Loading queue...</p>;
   }

   if (!queue || queue.length === 0) {
      return (
         <div className="max-w-3xl mx-auto py-8 px-2">
            <h1 className="text-2xl font-semibold mb-4">Review Queue</h1>
            <p className="text-muted-foreground">
               No transcriptions pending review.
            </p>
         </div>
      );
   }

   return (
      <div className="max-w-3xl mx-auto py-8 px-4">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold mb-6">Review Queue</h1>

            <div className="flex items-center gap-2 border rounded-md self-start">
               <span className="pl-3">
                  <ArrowUpDown className="text-gray-500" />
               </span>
               <select
                  value={sort}
                  onChange={(e) =>
                     setSort(e.target.value as 'oldest' | 'newest')
                  }
                  disabled={queue.length <= 1}
                  className={`rounded-md border bg-background px-3 py-1.5 text-sm ${queue.length <= 1 ? 'text-muted-foreground' : ''}`}
               >
                  <option value="oldest">Oldest first</option>
                  <option value="newest">Newest first</option>
               </select>
            </div>
         </div>

         <div className="flex flex-col gap-4">
            {queue.map((item) => (
               <QueueItem key={item.id} item={item} />
            ))}
         </div>
      </div>
   );
}
