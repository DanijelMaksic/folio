import { DocumentCard } from '@/components/documents/DocumentCard';
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
import { Link } from 'react-router-dom';
import CollectionTabs from '@/components/collections/CollectionTabs';

function CollectionDetails() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');

   const { id: collectionId } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const utils = trpc.useUtils();

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 500);
      return () => clearTimeout(t);
   }, [search]);

   const { data: collection, isLoading: isLoadingCollection } =
      trpc.collections.getById.useQuery({
         id: collectionId!,
      });

   const { data, isLoading: isLoadingDocs } = trpc.documents.list.useQuery(
      {
         collectionId: collectionId!,
         search: debouncedSearch || undefined,
         page: 1,
         limit: 100,
      },
      {
         placeholderData: (prev) => prev,
      },
   );

   const displayedDocuments = data?.documents;

   const isMyCollection = collection?.createdBy === user?.id;

   const editCollection = trpc.collections.update.useMutation({
      onSuccess: () => {
         utils.collections.getById.invalidate({ id: collectionId! });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setEditError(err.message);
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

   const handleEditOpen = () => {
      setEditTitle(collection?.title ?? '');
      setEditDescription(collection?.description ?? '');
      setIsEditOpen(true);
   };

   const handleEditSubmit = () => {
      editCollection.mutate({
         id: collectionId!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleDelete = async () => {
      deleteCollection.mutate({ id: collectionId as string });
   };

   const isSearchActive = debouncedSearch.length > 0;
   const showSearchBar = search.length > 0 || !!displayedDocuments?.length;

   if (isLoadingCollection) return <p>Loading...</p>;

   if (!collection) return <p>Collection not found</p>;

   return (
      <div className="max-w-4xl mx-auto py-6 px-12 space-y-3">
         <div className="grid grid-cols-[2fr_1.6fr] gap-3">
            <h1 className="text-2xl font-semibold">{collection.title}</h1>

            <div className="flex items-center justify-end gap-3">
               {showSearchBar ? (
                  <SearchBar
                     placeholder="Search documents..."
                     value={search}
                     onChange={setSearch}
                  />
               ) : null}

               <ActionsMenu
                  show={canTranscribe && (isMyCollection || editor)}
                  onEdit={handleEditOpen}
                  onDelete={() => setIsDeleteOpen(true)}
               />
            </div>
         </div>

         {collection.id && (
            <CollectionTabs
               isLoadingDocs={isLoadingDocs}
               isSearchActive={isSearchActive}
               displayedDocuments={displayedDocuments}
               description={collection.description}
            />
         )}

         {isEditOpen && (
            <EditModal
               heading="Edit Collection"
               error={editError}
               title={editTitle}
               description={editDescription}
               isPending={editCollection.isPending}
               onTitleChange={setEditTitle}
               onDescriptionChange={setEditDescription}
               onEdit={handleEditSubmit}
               onClose={() => {
                  setIsEditOpen(false);
                  setEditError('');
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
