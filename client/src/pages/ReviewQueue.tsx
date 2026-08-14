import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isEditor, QueueItem } from '@shared';
import { useNavigate } from 'react-router-dom';

export default function ReviewQueue() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const user = session?.user;

   const { data: queue } = trpc.transcriptions.listQueue.useQuery();

   if (!isEditor(user?.globalRole)) {
      return <div>No</div>;
   }

   if (!queue) {
      return <div>No transcriptions awaiting approval...</div>;
   }

   return (
      <div>
         {queue?.map((item: QueueItem) => (
            <div>
               <p>{item.documentTitle}</p>
               <p>{item.contributorUsername}</p>
               <p>{item.status}</p>
            </div>
         ))}
      </div>
   );
}
