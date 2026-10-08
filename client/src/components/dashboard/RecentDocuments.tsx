import { Link } from 'react-router-dom';
import type { DashboardOverview } from '@folio/shared';

type Props = {
   documents: DashboardOverview['recentDocuments'];
   isLoading: boolean;
   canContribute: boolean;
};

export function RecentDocuments({
   documents,
   isLoading,
   canContribute,
}: Props) {
   if (isLoading) {
      return (
         <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
               <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-lg border bg-muted"
               />
            ))}
         </div>
      );
   }

   if (documents.length === 0) {
      return (
         <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {canContribute
               ? "You haven't uploaded any documents yet."
               : 'Request the contributor role from your profile to start uploading documents.'}
         </p>
      );
   }

   return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
         {documents.map((doc) => (
            <Link
               key={doc.id}
               to={`/documents/${doc.id}`}
               data-testid="dashboard-document"
               className="overflow-hidden rounded-lg border transition-colors hover:bg-muted"
            >
               <div className="aspect-[3/4] bg-muted">
                  {doc.coverImageUrl ? (
                     <img
                        src={doc.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                     />
                  ) : null}
               </div>
               <div className="p-2">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                     {doc.status === 'processing'
                        ? 'Processing…'
                        : `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}`}
                  </p>
               </div>
            </Link>
         ))}
      </div>
   );
}
