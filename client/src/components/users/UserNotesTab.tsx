import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { useListParams } from '@/hooks/useListParams';
import ListControls from '@/components/users/ListControls';
import AppPagination from '@/components/shared/AppPagination';

const SORTS = ['newest', 'oldest'] as const;

type Sort = (typeof SORTS)[number];

const OPTIONS = [
   { value: 'newest', label: 'Newest' },
   { value: 'oldest', label: 'Oldest' },
];

function UserNotesTab({ userId }: { userId: string }) {
   const { page, search, sort, input, setInput, setPage, setSort } =
      useListParams<Sort>(SORTS, 'newest');

   const { data, isLoading } = trpc.notes.listByUser.useQuery(
      { userId, page, limit: 10, search: search || undefined, sort },
      { placeholderData: (prev) => prev },
   );

   const notes = data?.notes ?? [];

   return (
      <>
         <ListControls
            placeholder="Search notes..."
            input={input}
            onInput={setInput}
            sort={sort}
            onSort={(v) => setSort(v as Sort)}
            options={OPTIONS}
         />

         {isLoading ? (
            <p>Loading...</p>
         ) : !notes.length ? (
            <p className="text-muted-foreground">
               {search ? 'No notes found.' : 'No notes yet.'}
            </p>
         ) : (
            <div className="flex flex-col gap-3">
               {notes.map((n) => (
                  <div
                     key={n.id}
                     className="border rounded-md bg-gray-50 py-3 px-6"
                  >
                     <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mb-1">
                        <Link
                           to={`/documents/${n.documentId}/pages/${n.pageNumber}`}
                           className="underline"
                        >
                           {n.documentTitle} • {n.pageTitle}
                        </Link>
                        <span>•</span>
                        <span>
                           {new Date(n.createdAt).toLocaleDateString()}
                           {new Date(n.updatedAt) > new Date(n.createdAt) &&
                              ' (edited)'}
                        </span>
                     </div>
                     <p className="whitespace-pre-wrap break-words">
                        {n.content}
                     </p>
                  </div>
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

export default UserNotesTab;
