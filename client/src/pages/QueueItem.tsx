import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { trpc } from '../lib/trpc';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';

interface QueueItemProps {
   id: string;
   updatedAt: string;
   userId: string;
   status: 'draft' | 'submitted' | 'approved' | 'rejected';
   documentId: string;
   pageNumber: number;
   pageId: string;
   documentTitle: string;
   contributorUsername: string;
}

function QueueItem({ item }: { item: QueueItemProps }) {
   const navigate = useNavigate();
   const { data: session } = useSession();

   const { data: page } = trpc.pages.getById.useQuery({
      pageId: item.pageId,
   });

   return (
      <Card key={item.id}>
         <CardHeader>
            <CardTitle className="text-lg">
               {item.documentTitle} - {page?.title}
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
                  navigate(
                     `/documents/${item.documentId}/pages/${item.pageNumber}`,
                  )
               }
               disabled={session?.user.id === item.userId}
            >
               Review
            </Button>
         </CardContent>
      </Card>
   );
}

export default QueueItem;
