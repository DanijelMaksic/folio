import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import { useState } from 'react';
import type { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
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

   const { id: documentId, pageNumber } = useParams<{
      id: string;
      pageNumber: string;
   }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);

   const utils = trpc.useUtils();

   const { data: document } = trpc.documents.getById.useQuery({
      id: documentId!,
   });

   const { data: page, isLoading } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const isMyPage = document?.uploadedBy === user?.id;

   const editPage = trpc.pages.update.useMutation({
      onSuccess: () => {
         utils.pages.getByPageNumber.invalidate({
            documentId: documentId!,
            pageNumber: Number(pageNumber),
         });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setEditError(err.message);
      },
   });

   const deletePage = trpc.pages.delete.useMutation({
      onSuccess: () => {
         navigate(`/documents/${documentId}`, { replace: true });
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         resetViewerState(page?.id!);
         setDeleteError(err.message);
      },
   });

   const handleEditOpen = () => {
      setEditTitle(page?.title ?? '');
      setEditDescription(page?.description ?? '');
      setIsEditOpen(true);
   };

   const handleEditSubmit = () => {
      editPage.mutate({
         id: page?.id!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleDelete = async () => {
      deletePage.mutate({ id: page?.id as string });
   };

   if (isLoading) return <p>Loading...</p>;

   if (!page) return <p>Page not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{page.title}</h1>

            <ActionsMenu
               show={canTranscribe && (isMyPage || editor)}
               onEdit={handleEditOpen}
               onDelete={() => setIsDeleteOpen(true)}
            />
         </div>

         {page.id && (
            <PageTabs canTranscribe={canTranscribe} pageId={page.id} />
         )}

         <Outlet />

         {isEditOpen && (
            <EditModal
               heading="Edit Page"
               error={editError}
               title={editTitle}
               description={editDescription}
               isPending={editPage.isPending}
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
               isPending={deletePage.isPending}
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
