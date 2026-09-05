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

export default function Collections() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const { data: collections, isLoading } = trpc.collections.list.useQuery({
      page: 1,
      limit: 20,
   });

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 300);
      return () => clearTimeout(t);
   }, [search]);

   const { data: searchResults, isLoading: isLoadingSearch } =
      trpc.collections.search.useQuery(
         {
            query: search,
         },
         { enabled: search.length > 0 },
      );

   const displayedCollections =
      search && searchResults ? searchResults : collections;

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between gap-3 items-center mb-6">
            <h1 className="text-2xl font-semibold">Collections</h1>

            <ButtonGroup className="flex-1 max-w-sm">
               <Input
                  placeholder="Search collections..."
                  className="border-gray-400 w-full"
                  onChange={(e) => setSearch(e.target.value)}
                  value={search}
               />
               <Button
                  variant="outline"
                  aria-label="Search"
                  className="border-gray-400"
               >
                  <SearchIcon />
               </Button>
            </ButtonGroup>

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
               {debouncedSearch
                  ? 'No collections found.'
                  : 'No collections yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-2 gap-4">
               {displayedCollections.map((collection: Collection) => (
                  <CollectionCard collection={collection} key={collection.id} />
               ))}
            </div>
         )}
      </div>
   );
}
