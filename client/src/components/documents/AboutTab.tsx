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
               heading="Edit Document"
               serverError={serverError}
               initialTitle={document.title}
               initialDescription={document.description ?? ''}
               isPending={editDocument.isPending}
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
