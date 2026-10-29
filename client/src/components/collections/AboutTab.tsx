import { useState } from 'react';
import EditModal from '@/components/shared/EditModal';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Collection, isEditor } from '@shared';

const displayName = (name?: string | null) => name ?? 'Deleted user';

function AboutTab({ collection }: { collection: Collection }) {
   const { description } = collection;
   const { data: session } = useSession();
   const isOwner = session?.user.id === collection.createdBy;
   const canEdit = isOwner || isEditor(session?.user.globalRole);

   const [isEditOpen, setIsEditOpen] = useState(false);
   const [serverError, setServerError] = useState('');

   const utils = trpc.useUtils();

   const editCollection = trpc.collections.update.useMutation({
      onSuccess: () => {
         utils.collections.getById.invalidate({ id: collection.id });
         utils.collections.list.invalidate();
         setIsEditOpen(false);
         setServerError('');
      },
      onError: (err) => {
         const issues = err.data?.zodError;
         const firstIssue =
            issues?.find((i) => i.path[0] === 'title') ??
            issues?.find((i) => i.path[0] === 'description') ??
            issues?.[0];
         setServerError(firstIssue?.message ?? err.message);
      },
   });

   const details: { label: string; value: React.ReactNode }[] = [
      {
         label: 'Description',
         value: description ? (
            <div className="space-y-2">
               <p className="whitespace-pre-wrap">{description}</p>
            </div>
         ) : canEdit ? (
            <span className="text-muted-foreground">
               No description yet.{' '}
               <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
               >
                  Write one now.
               </button>
            </span>
         ) : (
            <span className="text-muted-foreground">
               No description provided.
            </span>
         ),
      },
      { label: 'Created by', value: displayName(collection.creatorName) },
      {
         label: 'Created',
         value: new Date(collection.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
         }),
      },
   ];

   return (
      <div className="space-y-6">
         <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
            {details.map(({ label, value }) => (
               <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
               </div>
            ))}
         </dl>

         {isEditOpen && (
            <EditModal
               heading="Edit Collection"
               serverError={serverError}
               initialTitle={collection.title}
               initialDescription={collection.description ?? ''}
               isPending={editCollection.isPending}
               hasDescription={true}
               onEdit={(values) =>
                  editCollection.mutate({ id: collection.id, ...values })
               }
               onClose={() => {
                  setIsEditOpen(false);
                  setServerError('');
               }}
            />
         )}
      </div>
   );
}

export default AboutTab;
