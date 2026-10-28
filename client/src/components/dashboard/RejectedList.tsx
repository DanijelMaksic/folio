import { Link } from 'react-router-dom';
import type { DashboardOverview } from '@folio/shared';

type Props = { items: DashboardOverview['rejectedTranscriptions'] };

export function RejectedList({ items }: Props) {
   return (
      <ul className="divide-y rounded-lg border">
         {items.map((item) => (
            <li key={item.id}>
               <Link
                  to={`/documents/${item.documentId}/pages/${item.pageNumber}`}
                  data-testid="rejected-item"
                  className="block p-4 hover:bg-muted"
               >
                  <div className="text-sm font-medium flex items-center justify-between gap-3">
                     <span>
                        {item.documentTitle} · Page {item.pageNumber}
                     </span>
                     <span className="text-destructive">
                        Transcription rejected
                     </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                     {item.rejectionReason ? (
                        <div>
                           <span className="font-medium">
                              Rejection reason:
                           </span>{' '}
                           {item.rejectionReason}
                        </div>
                     ) : (
                        'No reason provided'
                     )}
                  </p>
               </Link>
            </li>
         ))}
      </ul>
   );
}
