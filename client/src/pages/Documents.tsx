import { trpc } from '@/lib/trpc';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { DocumentCard } from '@/components/documents/DocumentCard.js';
import { ArrowUpDown, Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';
import AppPagination from '@/components/shared/AppPagination';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type DocumentSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
const SORTS: DocumentSort[] = ['newest', 'oldest', 'title-asc', 'title-desc'];

const SORT_LABELS: Record<DocumentSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
   'title-asc': 'Title A–Z',
   'title-desc': 'Title Z–A',
};

export default function Documents() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);
   const search = searchParams.get('search') ?? '';
   const [inputValue, setInputValue] = useState(search);

   const rawSort = searchParams.get('sort') as DocumentSort | null;
   const sort: DocumentSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   const handleSetSort = (newSort: DocumentSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

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

   const { data, isLoading } = trpc.documents.list.useQuery(
      {
         page,
         limit: 20,
         search: search || undefined,
         sort,
      },
      {
         placeholderData: (prev) => prev,
         staleTime: 1000,
      },
   );

   const documents = data?.documents ?? [];
   const totalPages = data?.totalPages ?? 1;

   const longest = Math.max(...Object.values(SORT_LABELS).map((l) => l.length));

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex items-center justify-between gap-3 mb-7.5">
            <h1
               data-testid="documents-label"
               className="text-2xl font-semibold"
            >
               Documents
            </h1>

            <SearchBar
               placeholder="Search documents..."
               value={inputValue}
               onChange={setInputValue}
            />

            <div className="flex items-center gap-3">
               <div className="flex items-center gap-3 border rounded-md">
                  <span className="pl-3">
                     <ArrowUpDown className="text-gray-500" />
                  </span>

                  <DropdownMenu>
                     <DropdownMenuTrigger
                        render={
                           <Button
                              variant="outline"
                              className="justify-between"
                              style={{ minWidth: `${longest + 2.5}ch` }}
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
                  <Button onClick={() => navigate('/documents/upload')}>
                     <Plus />
                  </Button>
               ) : (
                  <>
                     <span></span>
                     <span></span>
                  </>
               )}
            </div>
         </div>

         {isLoading ? (
            <p>Loading...</p>
         ) : !documents.length ? (
            <p className="text-muted-foreground">
               {search
                  ? 'No results found for your search.'
                  : 'No documents found.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {documents.map((document) => (
                  <DocumentCard document={document} key={document.id} />
               ))}
            </div>
         )}

         {!documents.length ? null : (
            <AppPagination
               currentPage={page}
               totalPages={totalPages}
               onPageChange={handlePageChange}
            />
         )}
      </div>
   );
}
