import { useSearchParams } from 'react-router-dom';
import AppPagination from '@/components/shared/AppPagination';
import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Collection, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';

export default function Collections() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);
   const search = searchParams.get('search') ?? '';
   const [inputValue, setInputValue] = useState(search);

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
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
      },
      {
         placeholderData: (prev: Collection) => prev,
         staleTime: 1000,
      },
   );

   const collections = data?.collections ?? [];
   const totalPages = data?.pages ?? 1;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between gap-3 items-center mb-6">
            <h1 className="text-2xl font-semibold">Collections</h1>

            <SearchBar
               placeholder="Search collections..."
               value={inputValue}
               onChange={setInputValue}
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

         {isLoading ? (
            <p>Loading...</p>
         ) : !collections.length ? (
            <p className="text-muted-foreground">
               {search ? 'No collections found.' : 'No collections yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {collections.map((collection: Collection) => (
                  <CollectionCard collection={collection} key={collection.id} />
               ))}
            </div>
         )}

         <AppPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
         />
      </div>
   );
}
