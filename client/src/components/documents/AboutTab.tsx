import EditModal from '@/components/shared/EditModal';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Document, isEditor } from '@shared';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

function AboutTab({ document }: { document: Document }) {
   const { description } = document;
   const { data: session } = useSession();
   const isOwner = session?.user.id === document.uploadedBy;
   const { id: documentId } = useParams<{ id: string }>();

   const [isEditOpen, setIsEditOpen] = useState(false);
   const [serverError, setServerError] = useState('');

   const utils = trpc.useUtils();

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: document.id });
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

   const canEdit = isOwner || isEditor(session?.user.globalRole);

   return (
      <div>
         {description ? (
            description
         ) : canEdit ? (
            <div className="text-muted-foreground">
               No description yet.{' '}
               <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
               >
                  Write one now.
               </button>
            </div>
         ) : (
            <span className="text-muted-foreground">
               No description provided.
            </span>
         )}

         {isEditOpen && (
            <EditModal
               heading="Edit Document"
               serverError={serverError}
               initialTitle={document.title}
               initialDescription={document.description ?? ''}
               isPending={editDocument.isPending}
               hasDescription={true}
               onEdit={(values) =>
                  editDocument.mutate({ id: documentId!, ...values })
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
