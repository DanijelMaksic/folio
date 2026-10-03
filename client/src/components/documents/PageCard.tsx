import { Page } from '@shared';
import { useNavigate } from 'react-router-dom';

function PageCard({ page, documentId }: { page: Page; documentId: string }) {
   const navigate = useNavigate();

   return (
      <button
         key={page.id}
         data-testid="page-card"
         onClick={() =>
            navigate(`/documents/${documentId}/pages/${page.pageNumber}`)
         }
         className="group relative rounded-lg overflow-hidden border hover:border-primary transition-colors"
      >
         <img
            src={page.imageUrl}
            alt={`Page ${page.pageNumber}`}
            className="w-full object-cover aspect-[3/4]"
         />
         <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 flex items-center justify-between">
            <span>{page.title}</span>
            {page.approvedTranscriptionCount > 0 && (
               <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                  ✓
               </span>
            )}
         </div>
      </button>
   );
}

export default PageCard;
