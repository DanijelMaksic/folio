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

type NoteData =
   inferRouterOutputs<AppRouter>['notes']['listByPage']['notes'][number];

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function timeAgo(date: string | Date) {
   const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
   const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31536000],
      ['month', 2592000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
   ];
   for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size)
         return rtf.format(Math.round(seconds / size), unit);
   }
   return 'just now';
}

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
   const isAuthor = !!note.userId && note.userId === session?.user.id;
   const canEdit = isAuthor && isContributor(role);
   const canDelete = isAuthor || isEditor(role);
   const name = note.authorUsername ?? 'Deleted user';
   const edited =
      !!note.updatedAt &&
      new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime();

   function cancelEdit() {
      reset({ content: note.content });
      setIsEditing(false);
   }

   return (
      <div className="flex gap-3">
         <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase">
            {name[0]}
         </div>

         <div className="border rounded-md bg-gray-50 flex-1 py-3 px-6">
            <div className="flex items-center gap-3 text-sm mb-1">
               <span className="font-semibold">{name}</span>
               <span className="text-muted-foreground">
                  {timeAgo(note.createdAt)}
                  {edited && ' (edited)'}
               </span>
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
                  className="space-y-2"
               >
                  <Textarea
                     rows={3}
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
                  <div className="flex gap-2">
                     <Button
                        type="submit"
                        size="sm"
                        disabled={!isDirty || update.isPending}
                     >
                        {update.isPending ? 'Saving...' : 'Save'}
                     </Button>
                     <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={cancelEdit}
                     >
                        Cancel
                     </Button>
                  </div>
               </form>
            ) : (
               <p className="whitespace-pre-wrap break-words">{note.content}</p>
            )}
         </div>
      </div>
   );
}

export default Note;
