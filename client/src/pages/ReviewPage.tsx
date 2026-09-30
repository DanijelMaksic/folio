import PageViewer from '@/components/documents/PageViewer';
import ReviewPanel from '@/components/documents/ReviewPanel';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isEditor } from '@shared';
import { useParams, useSearchParams } from 'react-router-dom';

function ReviewPage() {
   const { id, pageNumber } = useParams<{ id: string; pageNumber: string }>();
   const [searchParams] = useSearchParams();
   const userId = searchParams.get('userId');
   const { data: session } = useSession();
   const currentUser = session?.user;

   const { data: page, isLoading } = trpc.pages.getByPageNumber.useQuery({
      documentId: id!,
      pageNumber: Number(pageNumber),
   });

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByPageAndUser.useQuery(
         {
            pageId: page?.id!,
            userId: userId!,
         },
         {
            enabled:
               !!page?.id && !!userId && isEditor(currentUser?.globalRole),
         },
      );

   if (isLoading) return <div>Loading...</div>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{page?.title}</h1>

            <p className="text-sm text-muted-foreground">
               Submitted by{' '}
               <span className="font-medium text-foreground">
                  {submittedTranscription?.user.username}
               </span>
            </p>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <PageViewer page={page} />

            {isEditor(session?.user?.globalRole) ? (
               id &&
               submittedTranscription && (
                  <ReviewPanel
                     submittedTranscription={submittedTranscription}
                  />
               )
            ) : (
               <span></span>
            )}
         </div>
      </div>
   );
}

export default ReviewPage;
