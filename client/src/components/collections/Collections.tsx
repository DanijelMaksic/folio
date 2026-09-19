import { useSearchParams } from 'react-router-dom';
import AppPagination from '@/components/shared/AppPagination';
import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Collection, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { Input } from '@/components/ui/input';
import { Plus, SearchIcon } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';

export default function Collections() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const rawPage = Number(searchParams.get('page')) || 1;
   const page = rawPage > 0 ? rawPage : 1;

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   useEffect(() => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', '1');
         return next;
      });
   }, [debouncedSearch]);

   const { data, isLoading } = trpc.collections.list.useQuery({
      page,
      limit: 20,
   });

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 300);
      return () => clearTimeout(t);
   }, [search]);

   const { data: searchResults } = trpc.collections.search.useQuery(
      { query: debouncedSearch },
      {
         enabled: debouncedSearch.length > 0,
         placeholderData: (prev: Collection) => prev,
         staleTime: 1000,
      },
   );

   const isSearchActive = debouncedSearch.length > 0;
   const displayedCollections = isSearchActive
      ? searchResults
      : data?.collections;
   const totalPages = data?.totalPages ?? 1;

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between gap-3 items-center mb-6">
            <h1 className="text-2xl font-semibold">Collections</h1>

            <SearchBar
               placeholder="Search collections..."
               value={search}
               onChange={setSearch}
            />

            <span></span>

            {canTranscribe ? (
               <Button onClick={() => navigate('/collections/create')}>
                  <Plus />
               </Button>
            ) : (
               <>
                  <span></span>
                  <span></span>
               </>
            )}
         </div>

         {!displayedCollections?.length ? (
            <p className="text-muted-foreground">
               {isSearchActive
                  ? 'No collections found.'
                  : 'No collections yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {displayedCollections.map((collection: Collection) => (
                  <CollectionCard collection={collection} key={collection.id} />
               ))}
            </div>
         )}

         {!isSearchActive && (
            <AppPagination
               currentPage={page}
               totalPages={totalPages}
               onPageChange={handlePageChange}
            />
         )}
      </div>
   );
}
