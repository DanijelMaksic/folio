import { DocumentCard } from '@/components/documents/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { AppRouter } from '@server/trpc/router';
import { Document, isContributor, isEditor } from '@shared';
import { TRPCClientError } from '@trpc/client';
import { EllipsisVertical, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ButtonGroup } from '@/components/ui/button-group';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
               {displayedDocuments?.length ? (
                  <ButtonGroup className="w-full">
                     <Input
                        placeholder="Search documents..."
                        onChange={(e) => setSearch(e.target.value)}
                        value={search}
                        className="border-gray-400"
                     />
                     <Button
                        variant="outline"
                        aria-label="Search"
                        className="border-gray-400"
                     >
                        <SearchIcon />
                     </Button>
                  </ButtonGroup>
               ) : null}

               {canTranscribe && isMyCollection && !editor && (
                  <DropdownMenu>
                     <DropdownMenuTrigger
                        render={
                           <Button
                              variant="outline"
                              className="border-gray-400"
                           >
                              <EllipsisVertical />
                           </Button>
                        }
                     />
                     <DropdownMenuContent>
                        <DropdownMenuGroup>
                           <DropdownMenuItem onClick={handleEditOpen}>
                              Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              className="text-red-600 focus:bg-red-100 focus:text-red-700 transition-all"
                              onClick={() => setIsDeleteOpen(true)}
                           >
                              Delete
                           </DropdownMenuItem>
                        </DropdownMenuGroup>
                     </DropdownMenuContent>
                  </DropdownMenu>
               )}
            </div>

            {editor && (
               <div className="flex gap-3 items-center justify-center">
                  <Button onClick={handleEditOpen}>Edit</Button>

                  <Button
                     className="bg-red-700"
                     onClick={() => setIsDeleteOpen(true)}
                  >
                     Delete
                  </Button>
               </div>
            )}
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
                  <h2 className="text-lg font-semibold">Edit Collection</h2>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Title</label>
                     <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Description</label>
                     <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                     />
                  </div>

                  {editError && (
                     <p className="text-sm text-destructive">{editError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setIsEditOpen(false);
                           setEditError('');
                        }}
                     >
                        Cancel
                     </Button>

                     <Button
                        onClick={handleEditSubmit}
                        disabled={editCollection.isPending}
                     >
                        {editCollection.isPending ? 'Saving...' : 'Save'}
                     </Button>
                  </div>
               </div>
            </div>
         )}

         {isDeleteOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
                  <h2 className="text-lg font-semibold">Delete Collection</h2>

                  {deleteError && (
                     <p className="text-sm text-destructive">{deleteError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setIsDeleteOpen(false);
                           setDeleteError('');
                        }}
                     >
                        Cancel
                     </Button>

                     <Button
                        onClick={handleDelete}
                        disabled={deleteCollection.isPending}
                        className="bg-red-700"
                     >
                        {deleteCollection.isPending ? 'Deleting...' : 'Delete'}
                     </Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

export default CollectionDetails;
