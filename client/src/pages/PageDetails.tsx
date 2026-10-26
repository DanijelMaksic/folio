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
import { Link } from 'react-router-dom';
import ReplaceImageModal from '@/components/documents/ReplaceImageModal';
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
   Pagination,
   PaginationContent,
   PaginationItem,
   PaginationNext,
   PaginationPrevious,
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function PageDetails() {
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isReplaceImageOpen, setIsReplaceImageOpen] = useState(false);

   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');

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

   const { data: collection } = trpc.collections.getById.useQuery(
      {
         id: document?.collectionId!,
      },
      {
         enabled: !!document?.collectionId,
      },
   );

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
      deletePage.mutate({ pageId: page?.id as string });
   };

   if (isLoading) return <p>Loading...</p>;

   if (!page) return <p>Page not found</p>;

   return (
      <div className="max-w-full mx-auto py-3 px-12">
         <div className="mt-2">
            <Breadcrumb>
               <BreadcrumbList>
                  {collection && (
                     <>
                        {' '}
                        <BreadcrumbItem>
                           <BreadcrumbLink
                              render={
                                 <Link
                                    to={`${window.location.origin}/collections/${document?.collectionId}`}
                                 >
                                    {collection?.title}
                                 </Link>
                              }
                           />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                     </>
                  )}

                  <BreadcrumbItem>
                     <BreadcrumbLink
                        render={
                           <Link
                              to={`${window.location.origin}/documents/${document?.id}`}
                           >
                              {document?.title}
                           </Link>
                        }
                     />
                  </BreadcrumbItem>

                  <BreadcrumbSeparator />

                  <BreadcrumbItem>
                     <BreadcrumbPage>{page.title}</BreadcrumbPage>
                  </BreadcrumbItem>
               </BreadcrumbList>
            </Breadcrumb>
         </div>

         <h1 className="text-2xl font-semibold py-2" data-testid="page-title">
            {page.title}
         </h1>

         {page.id && (
            <PageTabs canTranscribe={canTranscribe} pageId={page.id}>
               <div className="flex items-center justify-center gap-3">
                  <Pagination className="border rounded-md border-gray-300 py-1 px-2">
                     <PaginationContent>
                        <PaginationItem className="flex items-center border-r border-gray-300 pr-2">
                           <button
                              onClick={(e) => {
                                 e.preventDefault();
                                 if (page.pageNumber > 1)
                                    navigate(
                                       `/documents/${documentId}/pages/${page.pageNumber - 1}`,
                                    );
                              }}
                              aria-disabled={page.pageNumber === 1}
                              className={
                                 page.pageNumber === 1
                                    ? 'pointer-events-none opacity-30'
                                    : ''
                              }
                           >
                              <ChevronLeft />
                           </button>
                        </PaginationItem>

                        <span className="px-2">
                           Page {page.pageNumber} of {+document?.pageCount!}
                        </span>

                        <PaginationItem className="flex items-center border-l border-gray-300 pl-2">
                           <button
                              onClick={(e) => {
                                 e.preventDefault();
                                 if (page.pageNumber < +document?.pageCount!)
                                    navigate(
                                       `/documents/${documentId}/pages/${page.pageNumber + 1}`,
                                    );
                              }}
                              aria-disabled={
                                 page.pageNumber === +document?.pageCount!
                              }
                              className={
                                 page.pageNumber === +document?.pageCount!
                                    ? 'pointer-events-none opacity-30'
                                    : ''
                              }
                           >
                              <ChevronRight />
                           </button>
                        </PaginationItem>
                     </PaginationContent>
                  </Pagination>

                  <ActionsMenu
                     show={canTranscribe && (isMyPage || editor)}
                     onReplaceImage={() => setIsReplaceImageOpen(true)}
                     onEdit={handleEditOpen}
                     onDelete={() => setIsDeleteOpen(true)}
                     isMyPage={isMyPage}
                     editor={editor}
                  />
               </div>
            </PageTabs>
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
               heading="Delete Page"
               error={deleteError}
               isPending={deletePage.isPending}
               onDelete={handleDelete}
               onClose={() => {
                  setIsDeleteOpen(false);
                  setDeleteError('');
               }}
            />
         )}

         {isReplaceImageOpen && page && (
            <ReplaceImageModal
               pageId={page.id}
               documentId={documentId!}
               pageNumber={Number(pageNumber)}
               onClose={() => setIsReplaceImageOpen(false)}
            />
         )}
      </div>
   );
}

export default PageDetails;
