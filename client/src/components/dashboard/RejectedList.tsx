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
                  <p className="text-sm font-medium">
                     {item.documentTitle} · Page {item.pageNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                     {item.rejectionReason || 'No reason provided'}
                  </p>
               </Link>
            </li>
         ))}
      </ul>
   );
}
