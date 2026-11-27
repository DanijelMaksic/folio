import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@server/trpc/router';
import {
   isContributor,
   isEditor,
   NOTE_MAX_LENGTH,
   NoteFormInput,
   noteFormSchema,
} from '@shared';
import ActionsMenu from '@/components/shared/ActionsMenu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { zodResolver } from '@/lib/zod-resolver';
import { Link } from 'react-router-dom';
import { formatDate, timeAgo } from '@/lib/helpers';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

type NoteData =
   inferRouterOutputs<AppRouter>['notes']['listByPage']['notes'][number];

function Note({ note }: { note: NoteData }) {
   const { data: session } = useSession();
   const utils = trpc.useUtils();
   const [isEditing, setIsEditing] = useState(false);

   const {
      register,
      handleSubmit,
      setError,
      reset,
      watch,
      formState: { errors, isDirty },
   } = useForm<NoteFormInput>({
      resolver: zodResolver(noteFormSchema),
      mode: 'onChange',
      defaultValues: { content: note.content },
   });
   const length = watch('content')?.length ?? 0;

   const invalidate = () =>
      utils.notes.listByPage.invalidate({ pageId: note.pageId });

   const remove = trpc.notes.delete.useMutation({ onSuccess: invalidate });

   const update = trpc.notes.update.useMutation({
      onSuccess: () => {
         invalidate();
         setIsEditing(false);
      },
      onError: (err) => setError('root', { message: err.message }),
   });

   const role = session?.user.globalRole;
   const avatar = note.authorAvatar;
   const isAuthor = !!note.userId && note.userId === session?.user.id;
   const canEdit = isAuthor && isContributor(role);
   const canDelete = isAuthor || isEditor(role);
   const username = note.authorUsername ?? 'Deleted user';
   const edited =
      !!note.updatedAt &&
      new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime();

   function cancelEdit() {
      reset({ content: note.content });
      setIsEditing(false);
   }

   return (
      <div className="flex gap-3">
         {avatar ? (
            <Link to={`/users/${username}`}>
               <img
                  src={avatar}
                  alt={`${session?.user?.name || session?.user.username}'s avatar`}
                  className="group relative size-12 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none border-2"
               />
            </Link>
         ) : (
            <Link
               to={`/users/${username}`}
               className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase"
            >
               {username[0]}
            </Link>
         )}

         <div className="border rounded-md bg-muted flex-1 pt-3 pb-6 px-6">
            <div className="flex items-center gap-3 text-sm mb-1">
               <Link
                  to={`/users/${username}`}
                  className="font-semibold hover:underline"
               >
                  {username}
               </Link>

               <Tooltip>
                  <TooltipTrigger
                     render={
                        <span className="text-muted-foreground cursor-default">
                           {timeAgo(note.createdAt)}
                           {edited && ' (edited)'}
                        </span>
                     }
                  />
                  <TooltipContent>
                     <span>{formatDate(note.createdAt)}</span>
                  </TooltipContent>
               </Tooltip>

               {!isEditing && (
                  <div className="ml-auto">
                     <ActionsMenu
                        show={canEdit || canDelete}
                        onEdit={canEdit ? () => setIsEditing(true) : undefined}
                        onDelete={
                           canDelete
                              ? () => remove.mutate({ id: note.id })
                              : undefined
                        }
                     />
                  </div>
               )}
            </div>

            {isEditing ? (
               <form
                  noValidate
                  onSubmit={handleSubmit(({ content }) =>
                     update.mutate({ id: note.id, content }),
                  )}
                  className={`space-y-4 ${update.isPending ? 'pointer-events-none opacity-65' : ''}`}
               >
                  <Textarea
                     rows={3}
                     aria-invalid={!!errors.content}
                     {...register('content')}
                     className="max-h-66 overflow-y-auto bg-white wrap-anywhere"
                  />
                  <div className="flex items-center justify-between gap-3">
                     <div className="flex justify-between text-sm self-start gap-3">
                        <span
                           className={`${length <= NOTE_MAX_LENGTH ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {length}/{NOTE_MAX_LENGTH}
                        </span>

                        <span className="text-destructive">
                           {errors.content?.message ?? errors.root?.message}
                        </span>
                     </div>
                     <div className="flex gap-2">
                        <Button
                           type="button"
                           size="sm"
                           variant="outline"
                           disabled={update.isPending}
                           onClick={cancelEdit}
                        >
                           Cancel
                        </Button>

                        <Button
                           type="submit"
                           size="sm"
                           disabled={
                              !isDirty || update.isPending || length > 1000
                           }
                        >
                           {update.isPending ? 'Saving...' : 'Save'}
                        </Button>
                     </div>
                  </div>
               </form>
            ) : (
               <p className="whitespace-pre-wrap wrap-break-words">
                  {note.content}
               </p>
            )}
         </div>
      </div>
   );
}

export default Note;
