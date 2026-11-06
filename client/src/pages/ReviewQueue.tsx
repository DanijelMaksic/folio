import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isEditor } from '@folio/shared';
import QueueItem from '@/pages/QueueItem';
import { useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type ItemSort = 'newest' | 'oldest';

const SORTS: ItemSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<ItemSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

export default function ReviewQueue() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const [searchParams, setSearchParams] = useSearchParams();

   const rawSort = searchParams.get('sort') as ItemSort | null;
   const sort: ItemSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const handleSetSort = (newSort: ItemSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

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

               <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                     render={
                        <Button
                           variant="outline"
                           className="justify-between min-w-24"
                        >
                           {SORT_LABELS[sort]}
                           <ChevronDown className="size-4 text-muted-foreground" />
                        </Button>
                     }
                  />
                  <DropdownMenuContent align="end">
                     {SORTS.map((s) => (
                        <DropdownMenuItem
                           key={s}
                           onClick={() => handleSetSort(s)}
                        >
                           {SORT_LABELS[s]}
                           {s === sort && <Check className="ml-auto size-4" />}
                        </DropdownMenuItem>
                     ))}
                  </DropdownMenuContent>
               </DropdownMenu>
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
