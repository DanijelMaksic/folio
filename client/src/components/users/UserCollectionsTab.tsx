import { trpc } from '@/lib/trpc';
import { useListParams } from '@/hooks/useListParams';
import ListControls from '@/components/users/ListControls';
import AppPagination from '@/components/shared/AppPagination';
import { CollectionCard } from '@/components/collections/CollectionCard';

const SORTS = [
   'newest',
   'oldest',
   'title-asc',
   'title-desc',
   'most-documents',
] as const;
type Sort = (typeof SORTS)[number];

const OPTIONS = [
   { value: 'newest', label: 'Newest' },
   { value: 'oldest', label: 'Oldest' },
   { value: 'title-asc', label: 'Title A–Z' },
   { value: 'title-desc', label: 'Title Z–A' },
   { value: 'most-documents', label: 'Most documents' },
];

function UserCollectionsTab({
   userId,
   isMe,
}: {
   userId: string;
   isMe: string;
}) {
   const { page, search, sort, input, setInput, setPage, setSort } =
      useListParams<Sort>(SORTS, 'newest');

   const { data, isLoading } = trpc.collections.list.useQuery(
      { userId, page, limit: 12, search: search || undefined, sort },
      { placeholderData: (prev) => prev },
   );

   const collections = data?.collections ?? [];

   return (
      <>
         <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
               {isMe ? 'My collections' : 'List of collections'}
            </h3>

            <ListControls
               placeholder="Search collections..."
               input={input}
               onInput={setInput}
               sort={sort}
               onSort={(v) => setSort(v as Sort)}
               options={OPTIONS}
            />
         </div>

         {isLoading ? (
            <p>Loading...</p>
         ) : !collections.length ? (
            <p className="text-muted-foreground">
               {search ? 'No collections found.' : 'No collections yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4">
               {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
               ))}
            </div>
         )}

         <AppPagination
            currentPage={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
         />
      </>
   );
}

export default UserCollectionsTab;
