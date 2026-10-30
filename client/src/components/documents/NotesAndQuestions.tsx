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

const PAGE_SIZE = 10;

function NotesAndQuestions({ pageId }: { pageId: string }) {
   const { data: session } = useSession();
   const [page, setPage] = useState(1);
   const utils = trpc.useUtils();

   const { data, isPending } = trpc.notes.listByPage.useQuery({
      pageId,
      page,
      limit: PAGE_SIZE,
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
      mode: 'onChange',
      defaultValues: { content: '' },
   });

   const length = watch('content')?.length ?? 0;

   const create = trpc.notes.create.useMutation({
      onSuccess: () => {
         reset({ content: '' });
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

         {canPost && (
            <form
               noValidate
               onSubmit={handleSubmit(({ content }) =>
                  create.mutate({ pageId, content }),
               )}
               className="mt-8 space-y-2"
            >
               <Textarea
                  rows={3}
                  placeholder="Write a note or question..."
                  aria-invalid={!!errors.content}
                  {...register('content')}
               />
               <div className="flex justify-between text-sm">
                  <span className="text-destructive">
                     {errors.content?.message ?? errors.root?.message}
                  </span>
                  <span
                     className={`${length <= NOTE_MAX_LENGTH ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                  >
                     {length}/{NOTE_MAX_LENGTH}
                  </span>
               </div>
               <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? 'Posting...' : 'Post'}
               </Button>
            </form>
         )}

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
      </div>
   );
}

export default NotesAndQuestions;
