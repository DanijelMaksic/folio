import { useSearchParams } from 'react-router-dom';
import AppPagination from '@/components/shared/AppPagination';
import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { ArrowUpDown, Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ColTranscribedFilter from '@/components/collections/ColTranscribedFilter';
import CategorySidebar from '@/components/categories/CategorySidebar';

export type CollectionSort =
   | 'newest'
   | 'oldest'
   | 'title-asc'
   | 'title-desc'
   | 'most-documents';

const SORTS: CollectionSort[] = [
   'newest',
   'oldest',
   'title-asc',
   'title-desc',
   'most-documents',
];

const SORT_LABELS: Record<CollectionSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
   'title-asc': 'Title A–Z',
   'title-desc': 'Title Z–A',
   'most-documents': 'Most documents',
};

export type CollectionStatusType =
   | 'all-collections'
   | 'transcribed'
   | 'not-transcribed';

const VALID_STATUSES: CollectionStatusType[] = [
   'all-collections',
   'transcribed',
   'not-transcribed',
];

export default function Collections() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);
   const search = searchParams.get('search') ?? '';
   const [inputValue, setInputValue] = useState(search);

   const rawSort = searchParams.get('sort') as CollectionSort | null;
   const sort: CollectionSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const rawStatus = searchParams.get('status') as CollectionStatusType | null;
   const status: CollectionStatusType =
      rawStatus && VALID_STATUSES.includes(rawStatus)
         ? rawStatus
         : 'all-collections';

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   const handleSetSort = (newSort: CollectionSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

   const handleSetStatus = (newStatus: CollectionStatusType) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newStatus === 'all-collections') {
            next.delete('status');
         } else {
            next.set('status', newStatus);
         }
         next.set('page', '1');
         return next;
      });
   };

   const category = searchParams.get('cat') ?? '';

   const handleSetCategory = (slug: string) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (slug) next.set('cat', slug);
         else next.delete('cat');
         next.set('page', '1');
         return next;
      });
   };

   // Debounce writes to URL
   useEffect(() => {
      const t = setTimeout(() => {
         setSearchParams(
            (prev) => {
               const next = new URLSearchParams(prev);
               if (inputValue) {
                  next.set('search', inputValue);
               } else {
                  next.delete('search');
               }
               next.set('page', '1');
               return next;
            },
            { replace: true },
         );
      }, 300);
      return () => clearTimeout(t);
   }, [inputValue]);

   const { data, isLoading } = trpc.collections.list.useQuery(
      {
         page,
         limit: 20,
         search: search || undefined,
         sort,
         status,
         categorySlug: category || undefined,
      },
      {
         placeholderData: (prev) => prev,
         staleTime: 1000,
      },
   );

   const collections = data?.collections ?? [];
   const totalPages = data?.totalPages ?? 1;

   return (
      <div className="py-6 px-20">
         <div className="flex items-center justify-between gap-3 border-b pb-3 mb-4">
            <h1 className="text-2xl font-semibold">Collections</h1>

            <div className="flex items-center gap-3">
               <SearchBar
                  placeholder="Search collections..."
                  value={inputValue}
                  onChange={setInputValue}
               />

               <ColTranscribedFilter
                  onSetStatus={handleSetStatus}
                  status={status}
               />

               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 border rounded-md">
                     <span className="pl-3">
                        <ArrowUpDown className="text-gray-500" />
                     </span>

                     <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                           render={
                              <Button
                                 variant="outline"
                                 className="justify-between min-w-40"
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
                                 {s === sort && (
                                    <Check className="ml-auto size-4" />
                                 )}
                              </DropdownMenuItem>
                           ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>

                  {canTranscribe ? (
                     <Button onClick={() => navigate('/collections/create')}>
                        <Plus /> Create
                     </Button>
                  ) : (
                     <>
                        <span></span>
                        <span></span>
                     </>
                  )}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
            <CategorySidebar value={category} onChange={handleSetCategory} />

            <div>
               {isLoading ? (
                  <p>Loading...</p>
               ) : !collections.length ? (
                  <p className="text-muted-foreground">
                     {search ? 'No collections found.' : 'No collections yet.'}
                  </p>
               ) : (
                  <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
                     {collections.map((collection) => (
                        <CollectionCard
                           collection={collection}
                           key={collection.id}
                        />
                     ))}
                  </div>
               )}

               {!collections.length ? null : (
                  <AppPagination
                     currentPage={page}
                     totalPages={totalPages}
                     onPageChange={handlePageChange}
                  />
               )}
            </div>
         </div>
      </div>
   );
}
