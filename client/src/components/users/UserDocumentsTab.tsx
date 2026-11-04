import { trpc } from '@/lib/trpc';
import { useListParams } from '@/hooks/useListParams';
import ListControls from '@/components/users/ListControls';
import { DocumentCard } from '@/components/documents/DocumentCard';
import AppPagination from '@/components/shared/AppPagination';

const SORTS = [
   'newest',
   'oldest',
   'title-asc',
   'title-desc',
   'most-pages',
   'most-transcribed',
] as const;
type Sort = (typeof SORTS)[number];

const OPTIONS = [
   { value: 'newest', label: 'Newest' },
   { value: 'oldest', label: 'Oldest' },
   { value: 'title-asc', label: 'Title A–Z' },
   { value: 'title-desc', label: 'Title Z–A' },
   { value: 'most-pages', label: 'Most pages' },
   { value: 'most-transcribed', label: 'Most transcribed' },
];

function UserDocumentsTab({ userId }: { userId: string }) {
   const { page, search, sort, input, setInput, setPage, setSort } =
      useListParams<Sort>(SORTS, 'newest');

   const { data, isLoading } = trpc.documents.list.useQuery(
      { userId, page, limit: 12, search: search || undefined, sort },
      { placeholderData: (prev) => prev },
   );

   const documents = data?.documents ?? [];

   return (
      <>
         <ListControls
            placeholder="Search documents..."
            input={input}
            onInput={setInput}
            sort={sort}
            onSort={(v) => setSort(v as Sort)}
            options={OPTIONS}
         />

         {isLoading ? (
            <p>Loading...</p>
         ) : !documents.length ? (
            <p className="text-muted-foreground">
               {search ? 'No documents found.' : 'No documents yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4">
               {documents.map((d) => (
                  <DocumentCard key={d.id} document={d} />
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

export default UserDocumentsTab;
