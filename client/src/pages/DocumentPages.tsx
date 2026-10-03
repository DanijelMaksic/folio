import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import AddPagesModal from '@/components/documents/AddPagesModal';
import TranscriptionFilter from '@/components/documents/TranscriptionFilter';
import PageCard from '@/components/documents/PageCard';

export type StatusType = 'all-pages' | 'transcribed' | 'not-transcribed';

const VALID_STATUSES: StatusType[] = [
   'all-pages',
   'transcribed',
   'not-transcribed',
];

function DocumentPages() {
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isAddPagesOpen, setIsAddPagesOpen] = useState(false);
   const [isCollectionOpen, setIsCollectionOpen] = useState(false);

   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [collectionError, setCollectionError] = useState('');

   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');
   const [selectedCollectionId, setSelectedCollectionId] = useState<
      string | null
   >(null);
   const { resetViewerState } = useViewerStore();
   const [searchParams, setSearchParams] = useSearchParams();

   const { id: documentId } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();

   const utils = trpc.useUtils();

   const rawStatus = searchParams.get('status') as StatusType | null;
   const status: StatusType =
      rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all-pages';

   const { data: document, isLoading: isLoadingDocument } =
      trpc.documents.getById.useQuery(
         { id: documentId! },
         {
            refetchInterval: (query) =>
               query.state.data?.status === 'processing' ? 2000 : false,
         },
      );

   const { data: pages, isLoading: isLoadingPages } =
      trpc.pages.getByDocument.useQuery(
         { documentId: documentId! },
         {
            // Poll every 3 seconds while processing
            refetchInterval: document?.status === 'processing' ? 2000 : false,
         },
      );

   const { data: collections, isLoading: isLoadingCollections } =
      trpc.collections.getCurrentUserCollections.useQuery(
         { page: 1, limit: 9 },
         { enabled: !!user?.id },
      );

   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);
   const isMyDocument = document?.uploadedBy === user?.id;
   const inCollection = !!document?.collectionId;

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: documentId! });
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
         utils.documents.getById.invalidate({ id: documentId! });
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
         id: documentId!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleDelete = () => {
      deleteDocument.mutate({ id: documentId! });
   };

   const handleAddToCollection = () => {
      addToCollection.mutate({
         id: documentId!,
         collectionId: selectedCollectionId,
      });
   };

   const handleSetStatus = (newStatus: StatusType) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newStatus === 'all-pages') {
            next.delete('status');
         } else {
            next.set('status', newStatus);
         }
         next.set('page', '1');
         return next;
      });
   };

   const filteredPages = pages?.filter((page) => {
      if (status === 'transcribed') return page.approvedTranscriptionCount > 0;
      if (status === 'not-transcribed')
         return page.approvedTranscriptionCount === 0;
      return true; // 'all-pages'
   });

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

            <div className="flex items-center justify-center gap-3">
               {!pages?.length ? null : (
                  <TranscriptionFilter
                     onSetStatus={handleSetStatus}
                     status={status}
                  />
               )}

               {(isMyDocument || editor) && document.status === 'ready' && (
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setIsAddPagesOpen(true)}
                  >
                     Add Pages
                  </Button>
               )}

               {(isMyDocument || editor) && document.status === 'ready' && (
                  <ActionsMenu
                     show={canTranscribe && (isMyDocument || editor)}
                     onEdit={handleEditOpen}
                     onDelete={() => setIsDeleteOpen(true)}
                     onSaveToCollection={handleCollectionOpen}
                     inCollection={inCollection}
                  />
               )}
            </div>
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
               ) : !filteredPages?.length ? (
                  <p className="text-muted-foreground">
                     No pages match this filter.
                  </p>
               ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {filteredPages.map((page) => (
                        <PageCard
                           page={page}
                           documentId={documentId!}
                           key={page.id}
                        />
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

         {isAddPagesOpen && (
            <AddPagesModal
               documentId={documentId!}
               onSuccess={() =>
                  utils.pages.getByDocument.invalidate({
                     documentId: documentId!,
                  })
               }
               onClose={() => setIsAddPagesOpen(false)}
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
