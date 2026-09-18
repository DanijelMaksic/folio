import { DocumentCard } from '@/components/documents/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AppRouter } from '@server/trpc/router';
import { Document, isContributor, isEditor } from '@shared';
import { TRPCClientError } from '@trpc/client';
import { EllipsisVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SearchBar from '@/components/shared/SearchBar';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';

function CollectionDetails() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');

   const { id } = useParams<{ id: string }>();
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

   const { data: collection, isLoadingCollection } =
      trpc.collections.getById.useQuery({
         id: id!,
      });

   const { data: savedDocuments, isLoading: isLoadingDocs } =
      trpc.documents.getByCollection.useQuery({
         collectionId: id!,
      });

   const { data: searchResults } = trpc.documents.search.useQuery(
      {
         query: debouncedSearch,
         collectionId: id!,
      },
      {
         enabled: debouncedSearch.length > 0,
         placeholderData: (prev: Document) => prev,
         staleTime: 1000,
      },
   );

   const isMyCollection = collection?.createdBy === user?.id;

   const editCollection = trpc.collections.update.useMutation({
      onSuccess: () => {
         utils.collections.getById.invalidate({ id: id! });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setEditError(err.message);
      },
   });

   const deleteCollection = trpc.collections.delete.useMutation({
      onSuccess: () => {
         navigate('/collections', { replace: true });
      },
      onError: (err: TRPCClientError<AppRouter>) => {
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
         id: id!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleDelete = async () => {
      deleteCollection.mutate({ id });
   };

   const isSearchActive = debouncedSearch.length > 0;
   const displayedDocuments = isSearchActive ? searchResults : savedDocuments;

   if (isLoadingCollection) return <p>Loading...</p>;

   if (!collection) return <p>Collection not found</p>;

   return (
      <div className="max-w-4xl mx-auto py-6 px-12 space-y-3">
         <div className="grid grid-cols-[2fr_1.6fr] gap-3">
            <h1 className="text-2xl font-semibold">{collection.title}</h1>

            <div className="flex items-center justify-end gap-3">
               {savedDocuments?.length ? (
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

         <p className="text-gray-500 mb-8">{collection.description}</p>

         {!displayedDocuments?.length ? (
            <p className="text-muted-foreground">
               {isSearchActive ? 'No documents found.' : 'No documents yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {displayedDocuments.map((doc: Document) => (
                  <DocumentCard doc={doc} key={doc.id} />
               ))}
            </div>
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
