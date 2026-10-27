import EditModal from '@/components/shared/EditModal';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { parseErrorMessage } from '@/lib/utils';
import { AppRouter } from '@server/trpc/router';
import { Document, isEditor } from '@shared';
import { TRPCClientErrorLike } from '@trpc/client';
import { useState } from 'react';

function AboutTab({ document }: { document: Document }) {
   const { description } = document;
   const { data: session } = useSession();
   const isOwner = session?.user.id === document.uploadedBy;

   const [isEditOpen, setIsEditOpen] = useState(false);
   const [editError, setEditError] = useState('');
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');

   const utils = trpc.useUtils();

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: document.id });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setEditError(parseErrorMessage(err.message));
      },
   });

   const handleEditOpen = () => {
      setEditTitle(document?.title ?? '');
      setEditDescription(document?.description ?? '');
      setIsEditOpen(true);
   };

   const handleEditSubmit = () => {
      editDocument.mutate({
         id: document.id,
         title: editTitle,
         description: editDescription,
      });
   };

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
                  onClick={handleEditOpen}
                  className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
               >
                  Write one now.
               </button>
            </div>
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
      </div>
   );
}

export default AboutTab;
