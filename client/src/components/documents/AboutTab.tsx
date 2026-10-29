import { useState } from 'react';
import { Link } from 'react-router-dom';
import EditModal from '@/components/shared/EditModal';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Document, isEditor } from '@shared';

const displayName = (name?: string | null) => name ?? 'Deleted user';

function AboutTab({ document }: { document: Document }) {
   const { description } = document;
   const { data: session } = useSession();
   const isOwner = session?.user.id === document.uploadedBy;
   const canEdit = isOwner || isEditor(session?.user.globalRole);

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

   const { data: collection } = trpc.collections.getById.useQuery(
      { id: document.collectionId! },
      { enabled: !!document.collectionId },
   );

   const { data: stats } = trpc.documents.getStats.useQuery({
      id: document.id,
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
      { label: 'Uploaded by', value: displayName(document.uploaderName) },
      {
         label: 'Upload date',
         value: new Date(document.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
         }),
      },
      { label: 'Pages', value: stats ? stats.totalPages : '—' },
      {
         label: 'Collection',
         value: document.collectionId ? (
            <Link
               to={`/collections/${document.collectionId}`}
               className="text-primary underline underline-offset-4 hover:opacity-80"
            >
               {collection?.title ?? 'View collection'}
            </Link>
         ) : (
            <span className="text-muted-foreground">Not in a collection</span>
         ),
      },
      {
         label: 'Transcribed',
         value: stats
            ? `${stats.percent}% (${stats.transcribedPages} of ${stats.totalPages} pages)`
            : '—',
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
               heading="Edit Document"
               serverError={serverError}
               initialTitle={document.title}
               initialDescription={document.description ?? ''}
               hasDescription={true}
               isPending={editDocument.isPending}
               onEdit={(values) =>
                  editDocument.mutate({ id: document.id, ...values })
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
