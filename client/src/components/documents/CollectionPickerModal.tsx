import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/shared/SearchBar';
import { trpc } from '@/lib/trpc';

const PAGE_SIZE = 10;

interface CollectionPickerModalProps {
   addToColPending: boolean;
   selectedId: string | null;
   error?: string;
   onClose: () => void;
   onSelect: (id: string | null) => void;
   onSave: () => void;
}

function CollectionPickerModal({
   addToColPending,
   error,
   onSelect,
   selectedId,
   onClose,
   onSave,
}: CollectionPickerModalProps) {
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [page, setPage] = useState(1);

   useEffect(() => {
      const t = setTimeout(() => {
         setDebouncedSearch(search);
         setPage(1); // a new search always starts at page 1
      }, 300);
      return () => clearTimeout(t);
   }, [search]);

   const { data, isLoading } =
      trpc.collections.getCurrentUserCollections.useQuery(
         {
            search: debouncedSearch || undefined,
            page,
            limit: PAGE_SIZE,
         },
         { placeholderData: (prev) => prev },
      );

   const collections = data?.collections;
   const totalPages = data?.totalPages ?? 1;
   const isSearching = debouncedSearch.length > 0;

   // "No collections at all" must not be confused with "no search results"
   const noCollections = !isLoading && data?.totalCount === 0 && !isSearching;
   const noResults = !isLoading && collections?.length === 0 && isSearching;

   // Show the search bar only when it's useful, and never hide it mid-search
   const showSearch = search.length > 0 || totalPages > 1;

   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Add to collection</h2>

            {noCollections ? (
               <div>
                  <p>You don't have any collections.</p>
                  <Link to="/collections/create" className="underline">
                     Create one to get started.
                  </Link>
               </div>
            ) : (
               <>
                  {showSearch && (
                     <SearchBar
                        placeholder="Search your collections..."
                        value={search}
                        onChange={setSearch}
                     />
                  )}

                  {isLoading ? (
                     <p>Loading...</p>
                  ) : noResults ? (
                     <p className="text-muted-foreground">
                        No collections found.
                     </p>
                  ) : (
                     <div className="grid grid-cols-3 gap-3">
                        {collections?.map((collection) => (
                           <button
                              key={collection.id}
                              onClick={() =>
                                 onSelect(
                                    selectedId === collection.id
                                       ? null
                                       : collection.id,
                                 )
                              }
                              className={`border border-gray-300 rounded-md p-4 ${
                                 collection.id === selectedId
                                    ? 'bg-gray-300'
                                    : ''
                              }`}
                           >
                              {collection.title}
                           </button>
                        ))}
                     </div>
                  )}

                  {totalPages > 1 && (
                     <div className="flex items-center justify-between text-sm">
                        <Button
                           variant="outline"
                           size="sm"
                           disabled={page <= 1}
                           onClick={() => setPage((p) => p - 1)}
                        >
                           Previous
                        </Button>
                        <span className="text-muted-foreground">
                           Page {page} of {totalPages}
                        </span>
                        <Button
                           variant="outline"
                           size="sm"
                           disabled={page >= totalPages}
                           onClick={() => setPage((p) => p + 1)}
                        >
                           Next
                        </Button>
                     </div>
                  )}
               </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>
                  {noCollections ? 'Close' : 'Cancel'}
               </Button>

               {noCollections ? null : (
                  <Button onClick={onSave} disabled={addToColPending}>
                     {addToColPending ? 'Saving...' : 'Save'}
                  </Button>
               )}
            </div>
         </div>
      </div>
   );
}

export default CollectionPickerModal;
