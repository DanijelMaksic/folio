import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
   isContributor,
   NOTE_MAX_LENGTH,
   NoteFormInput,
   noteFormSchema,
} from '@shared';
import Note from '@/components/documents/Note';
import AppPagination from '@/components/shared/AppPagination';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { zodResolver } from '@/lib/zod-resolver';
import { ArrowUpDown, Check, ChevronDown, User2 } from 'lucide-react';
import SignInModal from '@/components/documents/SignInModal';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 10;

type NoteSort = 'newest' | 'oldest';

const SORTS: NoteSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<NoteSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

function NotesAndQuestions({ pageId }: { pageId: string }) {
   const { data: session } = useSession();
   const [page, setPage] = useState(1);
   const [expanded, setExpanded] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [searchParams, setSearchParams] = useSearchParams();

   const utils = trpc.useUtils();

   const rawSort = searchParams.get('sort') as NoteSort | null;
   const sort: NoteSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const handleSetSort = (newSort: NoteSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

   function closeForm() {
      reset({ content: '' });
      setExpanded(false);
   }

   const { data, isPending } = trpc.notes.listByPage.useQuery({
      pageId,
      page,
      limit: PAGE_SIZE,
      sort,
   });

   const {
      register,
      handleSubmit,
      reset,
      setError,
      watch,
      formState: { errors },
   } = useForm<NoteFormInput>({
      resolver: zodResolver(noteFormSchema),
      defaultValues: { content: '' },
   });

   const content = watch('content') ?? '';
   const noteLength = content.length;

   const create = trpc.notes.create.useMutation({
      onSuccess: () => {
         closeForm();
         setPage(1);
         utils.notes.listByPage.invalidate({ pageId });
      },
      onError: (err) => setError('root', { message: err.message }),
   });
   const canPost = isContributor(session?.user.globalRole);

   return (
      <div className="max-w-3xl mx-auto my-12">
         <h2 className="text-2xl font-semibold text-center">
            Notes & Questions
         </h2>

         {canPost ? (
            <div className="flex items-center justify-between gap-3">
               {session?.user?.image ? (
                  <img
                     src={session.user.image}
                     alt={`${session.user?.name || session.user.username}'s avatar`}
                     className="group relative size-12 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none border-2 self-start mt-8"
                  />
               ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase self-start mt-8">
                     {session?.user.name[0]}
                  </div>
               )}

               <form
                  noValidate
                  onSubmit={handleSubmit(({ content }) =>
                     create.mutate({ pageId, content }),
                  )}
                  className="my-8 border rounded-md flex-1"
               >
                  <Textarea
                     rows={expanded ? 3 : 1}
                     placeholder="Write a note or question..."
                     aria-invalid={!!errors.content}
                     onFocus={() => setExpanded(true)}
                     {...register('content')}
                  />

                  {expanded && (
                     <div className="flex justify-between gap-2 my-3 mx-4">
                        <div className="flex flex-col">
                           {noteLength > 900 && (
                              <span
                                 className={`${noteLength <= NOTE_MAX_LENGTH ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                              >
                                 {noteLength}/{NOTE_MAX_LENGTH}
                              </span>
                           )}

                           <span className="text-destructive">
                              {errors.content?.message ?? errors.root?.message}
                           </span>
                        </div>

                        <div className="flex justify-end gap-2">
                           <Button
                              type="button"
                              variant="outline"
                              disabled={create.isPending}
                              onClick={closeForm}
                           >
                              Close
                           </Button>
                           <Button
                              type="submit"
                              disabled={
                                 create.isPending ||
                                 noteLength > NOTE_MAX_LENGTH
                              }
                           >
                              {create.isPending ? 'Posting...' : 'Post'}
                           </Button>{' '}
                        </div>
                     </div>
                  )}
               </form>
            </div>
         ) : (
            <div className="flex items-center justify-between gap-3">
               <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase self-start mt-8">
                  <User2 className="text-gray-500" />
               </div>

               <div className="my-8 border rounded-md flex-1">
                  <Textarea
                     placeholder="Write a note or question..."
                     onClick={() => setModalOpen(true)}
                  />
               </div>
            </div>
         )}

         <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
               <h4 className="text-xl">All notes</h4>
               <span className="bg-gray-100 rounded-md px-2.5 py-0.5">
                  {data?.notes.length}
               </span>
            </div>

            {data?.notes && (
               <div className="flex items-center gap-2 border rounded-md">
                  <span className="pl-3">
                     <ArrowUpDown className="text-gray-500" />
                  </span>

                  <DropdownMenu modal={false}>
                     <DropdownMenuTrigger
                        render={
                           <Button
                              variant="outline"
                              className="justify-between min-w-26"
                           >
                              {SORT_LABELS[sort]}
                              <ChevronDown className="size-4 text-muted-foreground" />
                           </Button>
                        }
                     />
                     <DropdownMenuContent align="end">
                        {SORTS.map((s) => (
                           <DropdownMenuItem
                              key={s}
                              onClick={() => handleSetSort(s)}
                           >
                              {SORT_LABELS[s]}
                              {s === sort && (
                                 <Check className="ml-auto size-4" />
                              )}
                           </DropdownMenuItem>
                        ))}
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            )}
         </div>

         <div className="flex flex-col gap-3 my-8 w-full">
            {isPending ? (
               <p className="text-muted-foreground">Loading...</p>
            ) : data?.notes.length ? (
               data.notes.map((n) => <Note key={n.id} note={n} />)
            ) : (
               <p className="text-center text-muted-foreground">
                  Nobody has written a note for this page yet.
               </p>
            )}
         </div>

         <AppPagination
            currentPage={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
         />

         {modalOpen && <SignInModal onClose={() => setModalOpen(false)} />}
      </div>
   );
}

export default NotesAndQuestions;
