import { useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import { useState } from 'react';
import { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
import CollectionPickerModal from '@/components/documents/CollectionPickerModal';
import { useViewerStore } from '@/store/useViewerStore';
import { Loader2 } from 'lucide-react';

function DocumentPages() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [collectionError, setCollectionError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isCollectionOpen, setIsCollectionOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');
   const [selectedCollectionId, setSelectedCollectionId] = useState<
      string | null
   >(null);
   const { resetViewerState } = useViewerStore();

   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();

   const utils = trpc.useUtils();

   const { data: document, isLoading: isLoadingDocument } =
      trpc.documents.getById.useQuery({ id: id! });

   const { data: pages, isLoading: isLoadingPages } =
      trpc.pages.getByDocument.useQuery(
         { documentId: id! },
         {
            // Poll every 3 seconds while processing
            refetchInterval: document?.status === 'processing' ? 3000 : false,
         },
      );

   const { data: collections, isLoading: isLoadingCollections } =
      trpc.collections.getCurrentUserCollections.useQuery(
         { page: 1, limit: 9, userId: user?.id ?? '' },
         { enabled: !!user?.id },
      );

   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);
   const isMyDocument = document?.uploadedBy === user?.id;
   const inCollection = !!document?.collectionId;

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setEditError(err.message);
      },
   });

   const deleteDocument = trpc.documents.delete.useMutation({
      onSuccess: () => {
         if (document) resetViewerState(document.id);
         navigate('/documents', { replace: true });
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setDeleteError(err.message);
      },
   });

   const addToCollection = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsCollectionOpen(false);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setCollectionError(err.message);
      },
   });

   const handleEditOpen = () => {
      setEditTitle(document?.title ?? '');
      setEditDescription(document?.description ?? '');
      setIsEditOpen(true);
   };

   const handleCollectionOpen = () => {
      setSelectedCollectionId(document?.collectionId ?? null);
      setIsCollectionOpen(true);
   };

   const handleEditSubmit = () => {
      editDocument.mutate({
         id: id!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleAddToCollection = () => {
      addToCollection.mutate({
         id: id!,
         collectionId: selectedCollectionId,
      });
   };

   const handleDelete = () => {
      deleteDocument.mutate({ id: id! });
   };

   if (isLoadingDocument) return <p>Loading...</p>;
   if (!document) return <p>Document not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-6">
         <div className="flex items-center justify-between gap-3">
            <div>
               <h1 className="text-2xl font-semibold">{document.title}</h1>
               {document.description && (
                  <p className="text-muted-foreground text-sm mt-1">
                     {document.description}
                  </p>
               )}
            </div>

            <ActionsMenu
               show={canTranscribe && (isMyDocument || editor)}
               onEdit={handleEditOpen}
               onDelete={() => setIsDeleteOpen(true)}
               onSaveToCollection={handleCollectionOpen}
               inCollection={inCollection}
            />
         </div>

         {document.status === 'processing' && (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
               <Loader2 className="animate-spin w-5 h-5" />
               <p>Processing PDF, this may take a moment...</p>
            </div>
         )}

         {document.status === 'failed' && (
            <p className="text-destructive text-center py-12">
               Failed to process this document. Please try uploading again.
            </p>
         )}

         {document.status === 'ready' && (
            <>
               {isLoadingPages ? (
                  <p>Loading pages...</p>
               ) : !pages?.length ? (
                  <p className="text-muted-foreground">No pages found.</p>
               ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {pages.map((page) => (
                        <button
                           key={page.id}
                           onClick={() =>
                              navigate(
                                 `/documents/${id}/pages/${page.pageNumber}`,
                              )
                           }
                           className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors"
                        >
                           <img
                              src={page.imageUrl}
                              alt={`Page ${page.pageNumber}`}
                              className="w-full object-cover aspect-[3/4]"
                           />
                           <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 flex items-center justify-between">
                              <span>Page {page.pageNumber}</span>
                              {page.approvedTranscriptionCount > 0 && (
                                 <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                                    ✓
                                 </span>
                              )}
                           </div>
                        </button>
                     ))}
                  </div>
               )}
            </>
         )}

         {isEditOpen && (
            <EditModal
               heading="Edit Document"
               error={editError}
               title={editTitle}
               description={editDescription}
               isPending={editDocument.isPending}
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
               heading="Delete Document"
               error={deleteError}
               isPending={deleteDocument.isPending}
               onDelete={handleDelete}
               onClose={() => {
                  setIsDeleteOpen(false);
                  setDeleteError('');
               }}
            />
         )}

         {isCollectionOpen && (
            <CollectionPickerModal
               collections={collections}
               selectedId={selectedCollectionId}
               error={collectionError}
               addToColPending={addToCollection.isPending}
               isLoadingCollections={isLoadingCollections}
               onSelect={setSelectedCollectionId}
               onSave={handleAddToCollection}
               onClose={() => {
                  setIsCollectionOpen(false);
                  setCollectionError('');
               }}
            />
         )}
      </div>
   );
}

export default DocumentPages;
