import EditModal from '@/components/shared/EditModal';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Collection, isEditor } from '@shared';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

function AboutTab({ collection }: { collection: Collection }) {
   const { description } = collection;
   const { data: session } = useSession();
   const isOwner = session?.user.id === collection.createdBy;
   const { id: collectionId } = useParams<{ id: string }>();

   const [isEditOpen, setIsEditOpen] = useState(false);
   const [serverError, setServerError] = useState('');

   const utils = trpc.useUtils();

   const editCollection = trpc.collections.update.useMutation({
      onSuccess: () => {
         utils.collections.getById.invalidate({ id: collection.id });
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

   return (
      <div>
         {description ? (
            description
         ) : !isOwner || isEditor(session?.user.globalRole) ? (
            'No description provided.'
         ) : (
            <div className="text-muted-foreground">
               No description yet.{' '}
               <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
               >
                  Write one now.
               </button>
            </div>
         )}

         {isEditOpen && (
            <EditModal
               heading="Edit Collection"
               serverError={serverError}
               initialTitle={collection.title}
               initialDescription={collection.description ?? ''}
               isPending={editCollection.isPending}
               onEdit={(values) =>
                  editCollection.mutate({ id: collectionId!, ...values })
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
