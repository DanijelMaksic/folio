import { Link, useSearchParams } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import AppPagination from '@/components/shared/AppPagination';
import { useListParams } from '@/hooks/useListParams';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import TranscriptionText from '@/components/documents/TranscriptionText';
import { formatDate } from '@/lib/helpers';

type VersionSort = 'newest' | 'oldest';

const SORTS: VersionSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<VersionSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

function UserTranscriptionsTab({ userId }: { userId: string }) {
   const { page } = useListParams<VersionSort>(SORTS, 'newest');

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

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   const { data, isLoading } = trpc.versions.listByUser.useQuery(
      { userId: userId, limit: 10, page, sort },
      { enabled: !!userId, placeholderData: (prev) => prev },
   );

   return (
      <div>
         <div className="flex items-center justify-between gap-3 my-3">
            <h3 className="text-lg font-semibold">
               List of approved transcriptions
            </h3>

            <div
               className={`flex items-center gap-2 border rounded-md ${data?.versions?.length! < 2 ? 'opacity-50 pointer-events-none' : ''}`}
            >
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

         {isLoading ? (
            <p>Loading...</p>
         ) : !data?.versions.length ? (
            <p className="text-muted-foreground">No transcriptions yet</p>
         ) : (
            <div className="flex flex-col gap-3">
               {data?.versions.map((t) => (
                  <div
                     key={t.id}
                     className="border rounded-md bg-gray-50 py-3 px-6"
                  >
                     <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm text-muted-foreground mb-1">
                        <div>
                           <Link
                              to={`/documents/${t.documentId}`}
                              className="hover:underline"
                           >
                              {t.documentTitle.length > 40
                                 ? `${t.documentTitle.slice(0, 40)}...`
                                 : t.documentTitle}
                           </Link>{' '}
                           <span>•</span>
                           <Link
                              className="hover:underline"
                              to={`/documents/${t.documentId}/pages/${t.pageNumber}`}
                           >
                              {' '}
                              {t.pageTitle.length > 20
                                 ? `${t.pageTitle.slice(0, 20)}...`
                                 : t.pageTitle}{' '}
                           </Link>
                           <span>•</span>{' '}
                           <span>{formatDate(t.approvedAt)}</span>{' '}
                           {t.isCurrent ? (
                              ''
                           ) : (
                              <>
                                 •{' '}
                                 <span className="text-sm border border-gray-300 capitalize  bg-muted rounded-md text-gray-500 px-2 py-1">
                                    Replaced
                                 </span>
                              </>
                           )}
                        </div>

                        <div>
                           <span>Approved by:</span>{' '}
                           <Link
                              to={`/users/${t.approverUsername}`}
                              className="hover:underline"
                           >
                              {t.approverUsername}
                           </Link>
                        </div>
                     </div>

                     <TranscriptionText
                        content={t.content}
                        className="line-clamp-12"
                     />
                  </div>
               ))}
            </div>
         )}

         <AppPagination
            currentPage={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={handlePageChange}
         />
      </div>
   );
}

export default UserTranscriptionsTab;
