import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import ReviewPanel from '@/components/documents/ReviewPanel';
import DocumentTabs from '@/components/documents/DocumentTabs';
import { useState } from 'react';
import { TRPCClientError } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
import CollectionPickerModal from '@/components/documents/CollectionPickerModal';
import { useViewerStore } from '@/store/useViewerStore';

export default function DocumentDetails() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [collectionError, setCollectionError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isCollectionOpen, setIsCollectionOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');
   const { resetViewerState } = useViewerStore();

   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);

   const utils = trpc.useUtils();

   const { data: document, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const [selectedCollectionId, setSelectedCollectionId] = useState(
      document?.collectionId ?? null,
   );

   const inCollection = !!document?.collectionId;

   const { data: collections, isLoading: isLoadingCollections } =
      trpc.collections.getCurrentUserCollections.useQuery(
         {
            page: 1,
            limit: 9,
            userId: user?.id,
         },
         { enabled: !!user },
      );

   const isMyDocument = document?.uploadedBy === user?.id;

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setEditError(err.message);
      },
   });

   const deleteDocument = trpc.documents.delete.useMutation({
      onSuccess: () => {
         navigate('/documents', { replace: true });
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         resetViewerState(document.id);
         setDeleteError(err.message);
      },
   });

   const addToCollection = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsCollectionOpen(false);
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setCollectionError(err.message);
      },
   });

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByDocument.useQuery(
         {
            documentId: id!,
         },
         {
            enabled: isEditor(user?.globalRole),
         },
      );

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

   const handleDelete = async () => {
      deleteDocument.mutate({ id });
   };

   if (isLoading) return <p>Loading...</p>;

   if (!document) return <p>Document not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{document.title}</h1>

            <ActionsMenu
               show={canTranscribe && (isMyDocument || editor)}
               onEdit={handleEditOpen}
               onDelete={() => setIsDeleteOpen(true)}
               onSaveToCollection={handleCollectionOpen}
               inCollection={inCollection}
            />
         </div>

         {id && <DocumentTabs canTranscribe={canTranscribe} documentId={id} />}

         <Outlet />

         {isEditor(session?.user?.globalRole) &&
            id &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <ReviewPanel
                  submittedTranscription={submittedTranscription}
                  documentId={id}
               />
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
