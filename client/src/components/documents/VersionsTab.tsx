import { trpc } from '@/lib/trpc';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TranscriptionText from '@/components/documents/TranscriptionText';

type VersionSort = 'newest' | 'oldest';

const SORTS: VersionSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<VersionSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

function VersionsTab() {
   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const [searchParams, setSearchParams] = useSearchParams();

   const rawSort = searchParams.get('sort') as VersionSort | null;
   const sort: VersionSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const handleSetSort = (newSort: VersionSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

   const { data: page } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const { data: approved } = trpc.transcriptions.getApprovedByPage.useQuery(
      { pageId: page?.id! },
      { enabled: !!page?.id },
   );

   const { data: versions, isLoading } = trpc.versions.listByPage.useQuery(
      { pageId: page?.id!, limit: 30, sort },
      { enabled: !!page?.id },
   );

   const fmt = (d: string | Date) =>
      new Date(d).toLocaleDateString(undefined, {
         year: 'numeric',
         month: 'short',
         day: 'numeric',
      });

   return (
      <div className="space-y-3 border rounded-md px-4 py-3">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Versions</h2>

            <DropdownMenu modal={false} disabled={versions?.length! < 2}>
               <DropdownMenuTrigger
                  render={
                     <Button
                        variant="outline"
                        className="justify-between min-w-32 gap-2"
                     >
                        <ArrowUpDown className="size-4 text-muted-foreground" />
                        {SORT_LABELS[sort]}
                        <ChevronDown className="size-4 text-muted-foreground" />
                     </Button>
                  }
               />
               <DropdownMenuContent align="end">
                  {SORTS.map((s) => (
                     <DropdownMenuItem key={s} onClick={() => handleSetSort(s)}>
                        {SORT_LABELS[s]}
                        {s === sort && <Check className="ml-auto size-4" />}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
            </DropdownMenu>
         </div>

         {isLoading ? (
            <p className="text-muted-foreground border rounded-md p-4 ">
               Loading...
            </p>
         ) : !versions?.length ? (
            <p className="text-muted-foreground py-10 text-center text-[1rem] border rounded-md">
               No approved versions yet.
            </p>
         ) : (
            <ul className="space-y-3">
               {versions.map((v) => (
                  <li
                     key={v.id}
                     className="border rounded-md p-4 space-y-2"
                     data-testid="version-item"
                  >
                     <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        {v.transcriptionId === approved?.id && (
                           <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              Current
                           </span>
                        )}
                        <span>{fmt(v.approvedAt)}</span>
                        <span>•</span>
                        <span>
                           Transcribed by{' '}
                           {v.authorUsername ? (
                              <Link
                                 to={`/users/${v.authorUsername}`}
                                 className="underline"
                              >
                                 {v.authorUsername}
                              </Link>
                           ) : (
                              'Deleted user'
                           )}
                        </span>
                        <span>•</span>
                        <span>
                           Approved by{' '}
                           {v.approverUsername ? (
                              <Link
                                 to={`/users/${v.approverUsername}`}
                                 className="underline"
                              >
                                 {v.approverUsername}
                              </Link>
                           ) : (
                              'Deleted user'
                           )}
                        </span>
                     </div>

                     {v.isBlank ? (
                        <p className="text-muted-foreground">
                           This page is blank
                        </p>
                     ) : (
                        <TranscriptionText content={v.content} />
                     )}
                  </li>
               ))}
            </ul>
         )}
      </div>
   );
}

export default VersionsTab;
