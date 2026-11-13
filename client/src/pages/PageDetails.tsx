import {
   useNavigate,
   useParams,
   useSearchParams,
   Link,
} from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useSession } from '../lib/auth-client';
import { isContributor, isEditor } from '@shared';
import { useEffect, useState } from 'react';
import type { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import DeleteModal from '@/components/shared/DeleteModal';
import EditModal from '@/components/shared/EditModal';
import ActionsMenu from '@/components/shared/ActionsMenu';
import { useViewerStore } from '@/store/useViewerStore';
import PageTabs from '@/components/documents/PageTabs';
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
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuGroup,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
   Pagination,
   PaginationContent,
   PaginationItem,
} from '@/components/ui/pagination';
import {
   Check,
   ChevronDown,
   ChevronLeft,
   ChevronRight,
   Fullscreen,
   Maximize2,
   Minimize2,
   PanelBottom,
   PanelLeft,
   PanelRight,
   PanelTop,
} from 'lucide-react';
import NotesAndQuestions from '@/components/documents/NotesAndQuestions';
import { Button } from '@/components/ui/button';

const TABS = [
   'overview',
   'versions',
   'transcribe',
   'revision-history',
   'guidelines',
] as const;
type Tab = (typeof TABS)[number];

const truncate = (s: string | undefined, n = 50) =>
   s && s.length > n ? `${s.slice(0, n)}...` : s;

function PageDetails() {
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isReplaceImageOpen, setIsReplaceImageOpen] = useState(false);
   const [serverError, setServerError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [searchParams, setSearchParams] = useSearchParams();

   const {
      resetViewerState,
      focusMode,
      setFocusMode,
      imagePosition,
      setImagePosition,
   } = useViewerStore();

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

   const raw = searchParams.get('tab');
   const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'overview';

   // Focus mode only makes sense where the image sits next to text
   const canFocus = tab === 'overview' || tab === 'transcribe';

   // Reset on leaving the page
   useEffect(() => () => setFocusMode(false), [setFocusMode]);

   // Leave focus mode if the tab changes to one that doesn't support it
   useEffect(() => {
      if (!canFocus) setFocusMode(false);
   }, [canFocus, setFocusMode]);

   useEffect(() => {
      if (!focusMode) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') setFocusMode(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [focusMode, setFocusMode]);

   const { data: doc } = trpc.documents.getById.useQuery({ id: documentId! });

   const { data: page, isLoading } = trpc.pages.getByPageNumber.useQuery({
      documentId: documentId!,
      pageNumber: Number(pageNumber),
   });

   const { data: collection } = trpc.collections.getById.useQuery(
      { id: doc?.collectionId! },
      { enabled: !!doc?.collectionId },
   );

   const { data: transcription } = trpc.transcriptions.getByPage.useQuery(
      { pageId: page?.id! },
      { enabled: canTranscribe && !!page?.id },
   );

   const isMyPage = doc?.uploadedBy === user?.id;
   const pageCount = Number(doc?.pageCount ?? 0);

   const editPage = trpc.pages.update.useMutation({
      onSuccess: () => {
         utils.pages.getByPageNumber.invalidate({
            documentId: documentId!,
            pageNumber: Number(pageNumber),
         });
         setIsEditOpen(false);
         setServerError('');
      },
      onError: (err) => {
         const issues = err.data?.zodError;
         const firstIssue = issues?.find((i) => i.path[0] === 'title');
         setServerError(firstIssue?.message ?? err.message);
      },
   });

   const deletePage = trpc.pages.delete.useMutation({
      onSuccess: () => navigate(`/documents/${documentId}`, { replace: true }),
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         resetViewerState(page?.id!);
         setDeleteError(err.message);
      },
   });

   function handleTabChange(value: string) {
      setSearchParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            if (value === 'overview') next.delete('tab');
            else next.set('tab', value);
            return next;
         },
         { replace: true },
      );
   }

   if (isLoading) return <p>Loading...</p>;
   if (!page) return <p>Page not found</p>;

   return (
      <div
         className={
            focusMode
               ? 'flex h-full flex-col px-6 pt-3 pb-4'
               : 'max-w-full mx-auto py-3 px-20'
         }
      >
         {!focusMode && (
            <>
               <div className="mt-2">
                  <Breadcrumb>
                     <BreadcrumbList>
                        {collection && (
                           <>
                              <BreadcrumbItem>
                                 <BreadcrumbLink
                                    render={
                                       <Link
                                          to={`/collections/${doc?.collectionId}`}
                                       >
                                          {truncate(collection.title)}
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
                                 <Link to={`/documents/${doc?.id}`}>
                                    {truncate(doc?.title)}
                                 </Link>
                              }
                           />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                           <BreadcrumbPage>
                              {truncate(page.title)}
                           </BreadcrumbPage>
                        </BreadcrumbItem>
                     </BreadcrumbList>
                  </Breadcrumb>
               </div>

               <h1
                  className="text-2xl font-semibold py-2"
                  data-testid="page-title"
               >
                  {page.title}
               </h1>
            </>
         )}

         {page.id && (
            <div
               className={
                  focusMode ? 'flex min-h-0 flex-1 flex-col' : undefined
               }
            >
               <PageTabs
                  tab={tab}
                  onTabChange={handleTabChange}
                  transcription={transcription}
                  focusMode={focusMode}
                  pageTitle={page.title}
               >
                  <div className="flex items-center justify-center gap-3 text-sm">
                     {canFocus && (
                        <DropdownMenu modal={false}>
                           <DropdownMenuTrigger
                              render={
                                 <Button
                                    variant="outline"
                                    className="justify-between min-w-40"
                                 >
                                    {imagePosition === 'left' && (
                                       <div className="flex items-center gap-2">
                                          <PanelLeft />
                                          Image at the left
                                       </div>
                                    )}
                                    {imagePosition === 'right' && (
                                       <div className="flex items-center gap-2">
                                          <PanelRight />
                                          Image at the right
                                       </div>
                                    )}
                                    {imagePosition === 'top' && (
                                       <div className="flex items-center gap-2">
                                          <PanelTop />
                                          Image at the top
                                       </div>
                                    )}
                                    {imagePosition === 'bottom' && (
                                       <div className="flex items-center gap-2">
                                          <PanelBottom />
                                          Image at the bottom
                                       </div>
                                    )}
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                 </Button>
                              }
                           />

                           <DropdownMenuContent>
                              <DropdownMenuGroup>
                                 <DropdownMenuItem
                                    onClick={() => setImagePosition('left')}
                                 >
                                    Image at the left
                                    {imagePosition === 'left' && (
                                       <Check className="ml-auto size-4" />
                                    )}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    onClick={() => setImagePosition('right')}
                                 >
                                    Image at the right
                                    {imagePosition === 'right' && (
                                       <Check className="ml-auto size-4" />
                                    )}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    onClick={() => setImagePosition('top')}
                                 >
                                    Image at the top
                                    {imagePosition === 'top' && (
                                       <Check className="ml-auto size-4" />
                                    )}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    onClick={() => setImagePosition('bottom')}
                                 >
                                    Image at the bottom
                                    {imagePosition === 'bottom' && (
                                       <Check className="ml-auto size-4" />
                                    )}
                                 </DropdownMenuItem>
                              </DropdownMenuGroup>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     )}

                     {canFocus && (
                        <Button
                           variant="outline"
                           onClick={() => setFocusMode(!focusMode)}
                        >
                           {focusMode ? (
                              <>
                                 <Minimize2 /> Minimize
                              </>
                           ) : (
                              <>
                                 <Maximize2 /> Maximize
                              </>
                           )}
                        </Button>
                     )}

                     <Pagination className="border rounded-md border-gray-300 py-1 px-2">
                        <PaginationContent>
                           <PaginationItem className="flex items-center border-r border-gray-300 pr-2 py-0.5">
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
                                 <ChevronLeft size={22} />
                              </button>
                           </PaginationItem>

                           <span className="px-2">
                              Page {page.pageNumber} of {pageCount}
                           </span>

                           <PaginationItem className="flex items-center border-l border-gray-300 pl-2">
                              <button
                                 onClick={(e) => {
                                    e.preventDefault();
                                    if (page.pageNumber < pageCount)
                                       navigate(
                                          `/documents/${documentId}/pages/${page.pageNumber + 1}`,
                                       );
                                 }}
                                 aria-disabled={page.pageNumber === pageCount}
                                 className={
                                    page.pageNumber === pageCount
                                       ? 'pointer-events-none opacity-30'
                                       : ''
                                 }
                              >
                                 <ChevronRight size={22} />
                              </button>
                           </PaginationItem>
                        </PaginationContent>
                     </Pagination>

                     {!focusMode && (
                        <ActionsMenu
                           show={canTranscribe && (isMyPage || editor)}
                           onReplaceImage={() => setIsReplaceImageOpen(true)}
                           onEdit={() => setIsEditOpen(true)}
                           onDelete={() => setIsDeleteOpen(true)}
                           isMyPage={isMyPage}
                           editor={editor}
                        />
                     )}
                  </div>
               </PageTabs>
            </div>
         )}

         {!focusMode && canFocus && <NotesAndQuestions pageId={page.id} />}

         {isEditOpen && (
            <EditModal
               heading="Edit Page"
               serverError={serverError}
               initialTitle={page.title}
               isPending={editPage.isPending}
               hasDescription={false}
               onEdit={(values) => editPage.mutate({ id: page.id!, ...values })}
               onClose={() => {
                  setIsEditOpen(false);
                  setServerError('');
               }}
            />
         )}

         {isDeleteOpen && (
            <DeleteModal
               heading="Delete Page"
               error={deleteError}
               isPending={deletePage.isPending}
               onDelete={() => deletePage.mutate({ pageId: page.id })}
               onClose={() => {
                  setIsDeleteOpen(false);
                  setDeleteError('');
               }}
            />
         )}

         {isReplaceImageOpen && (
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
