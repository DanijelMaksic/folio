import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AppRouter } from '@server/trpc/router';
import { isContributor, isEditor } from '@shared';
import { TRPCClientErrorLike } from '@trpc/client';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SearchBar from '@/components/shared/SearchBar';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
import CollectionTabs from '@/components/collections/CollectionTabs';

function CollectionDetails() {
   const [serverError, setServerError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);

   const { id: collectionId } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const PAGE_SIZE = 9;
   const [page, setPage] = useState(1);

   const utils = trpc.useUtils();

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 500);
      return () => clearTimeout(t);
   }, [search]);

   const { data: collection, isLoading: isLoadingCollection } =
      trpc.collections.getById.useQuery({
         id: collectionId!,
      });

   // reset page when search changes
   useEffect(() => {
      setPage(1);
   }, [debouncedSearch]);

   const { data, isLoading: isLoadingDocs } = trpc.documents.list.useQuery(
      {
         collectionId: collectionId!,
         search: debouncedSearch || undefined,
         page,
         limit: PAGE_SIZE,
      },
      { placeholderData: (prev) => prev },
   );

   const displayedDocuments = data?.documents;
   const totalPages = data?.totalPages ?? 1;

   const isMyCollection = collection?.createdBy === user?.id;

   const editCollection = trpc.collections.update.useMutation({
      onSuccess: () => {
         utils.collections.getById.invalidate({ id: collectionId! });
         setIsEditOpen(false);
         setServerError('');
      },
      onError: (err) => {
         const issues = err.data?.zodError;
         const firstIssue =
            issues?.find((i) => i.path[0] === 'title') ??
            issues?.find((i) => i.path[0] === 'description') ??
            issues?.[0];
         setServerError(firstIssue?.message ?? err.message);
      },
   });

   const deleteCollection = trpc.collections.delete.useMutation({
      onSuccess: () => {
         navigate('/collections', { replace: true });
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setDeleteError(err.message);
      },
   });

   const handleDelete = async () => {
      deleteCollection.mutate({ id: collectionId as string });
   };

   const isSearchActive = debouncedSearch.length > 0;
   const showSearchBar = search.length > 0 || !!displayedDocuments?.length;

   if (isLoadingCollection) return <p>Loading...</p>;

   if (!collection) return <p>Collection not found</p>;

   return (
      <div className="max-w-4xl mx-auto py-6 px-12 space-y-3">
         <h1 className="text-2xl font-semibold">{collection.title}</h1>

         {collection.id && (
            <CollectionTabs
               isLoadingDocs={isLoadingDocs}
               isSearchActive={isSearchActive}
               displayedDocuments={displayedDocuments}
               collection={collection}
               page={page}
               totalPages={totalPages}
               onPageChange={setPage}
            >
               <div className="flex items-center justify-end gap-3 mt-1 mb-4">
                  {showSearchBar ? (
                     <SearchBar
                        placeholder="Search documents..."
                        value={search}
                        onChange={setSearch}
                     />
                  ) : null}

                  <ActionsMenu
                     show={canTranscribe && (isMyCollection || editor)}
                     onEdit={() => setIsEditOpen(true)}
                     onDelete={() => setIsDeleteOpen(true)}
                  />
               </div>
            </CollectionTabs>
         )}

         {isEditOpen && (
            <EditModal
               heading="Edit Collection"
               isPending={editCollection.isPending}
               initialTitle={collection.title}
               initialDescription={collection.description ?? ''}
               serverError={serverError}
               onEdit={(values) =>
                  editCollection.mutate({ id: collectionId!, ...values })
               }
               onClose={() => {
                  setIsEditOpen(false);
                  setServerError('');
               }}
            />
         )}

         {isDeleteOpen && (
            <DeleteModal
               heading="Delete Collection"
               error={deleteError}
               isPending={deleteCollection.isPending}
               onDelete={handleDelete}
               onClose={() => {
                  setIsDeleteOpen(false);
                  setDeleteError('');
               }}
            />
         )}
      </div>
   );
}

export default CollectionDetails;
