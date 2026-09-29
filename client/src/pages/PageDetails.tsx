import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import ReviewPanel from '@/components/documents/ReviewPanel';
import { useState } from 'react';
import type { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
import CollectionPickerModal from '@/components/documents/CollectionPickerModal';
import { useViewerStore } from '@/store/useViewerStore';
import PageTabs from '@/components/documents/PageTabs';

function PageDetails() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');
   const { resetViewerState } = useViewerStore();

   const { id, pageNumber } = useParams<{ id: string; pageNumber: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);

   const utils = trpc.useUtils();

   const { data: document } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const { data: page, isLoading } = trpc.pages.getByPageNumber.useQuery({
      documentId: id!,
      pageNumber: Number(pageNumber),
   });

   const isMyDocument = document?.uploadedBy === user?.id;

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
         navigate('/documents', { replace: true });
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         resetViewerState(document?.id!);
         setDeleteError(err.message);
      },
   });

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByPage.useQuery(
         {
            pageId: id!,
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

   const handleEditSubmit = () => {
      editDocument.mutate({
         id: id!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleDelete = async () => {
      deleteDocument.mutate({ id: id as string });
   };

   if (isLoading) return <p>Loading...</p>;

   if (!page) return <p>Page not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{page.title}</h1>

            <ActionsMenu
               show={canTranscribe && (isMyDocument || editor)}
               onEdit={handleEditOpen}
               onDelete={() => setIsDeleteOpen(true)}
            />
         </div>

         {id && <PageTabs canTranscribe={canTranscribe} pageId={id} />}

         <Outlet />

         {isEditor(session?.user?.globalRole) &&
            id &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <ReviewPanel
                  submittedTranscription={submittedTranscription}
                  pageId={id}
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
      </div>
   );
}

export default PageDetails;
