import { useCloudinaryUrl } from '@/hooks/useCloudinaryUrl';
import { trpc } from '@/lib/trpc';
import { Document } from '@shared';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DocumentCard({ document }: { document: Document }) {
   const { id, title, uploaderName, coverImageUrl, pageCount } = document;

   const { data: stats } = trpc.documents.getStats.useQuery({
      id: document.id,
   });

   const { detail } = useCloudinaryUrl();

   return (
      <Link
         to={`/documents/${id}`}
         data-testid="document-card"
         className="relative flex flex-col justify-between h-90 rounded-xl p-6 group cursor-pointer hover:translate-y-[-6px] transition duration-300 hover:shadow-2xl overflow-hidden"
      >
         <span className="absolute -inset-px m-0 bg-linear-to-t from-gray-800 group-hover:from-gray-900 z-10 pointer-events-none rounded-xl md:rounded-2xl transition duration-300 group-hover:saturate-120" />

         <img
            src={detail(coverImageUrl, 450) || undefined}
            alt="Document image"
            className="absolute inset-0 h-full w-full object-cover rounded-xl md:rounded-2xl"
         />

         <span />

         <div className="z-20 space-y-0.5">
            <div className="space-x-2 text-sm text-gray-300/70">
               <span>{uploaderName ?? 'Deleted user'}</span>
               <span>•</span>
               <span className="space-x-2 text-sm text-gray-300/70">
                  {pageCount} {Number(pageCount) === 1 ? 'Page' : 'Pages'}
               </span>
            </div>

            <h2
               className="text-gray-50 text-xl font-medium font-title leading-9.5 2xl:leading-9 lg:leading-8 md:leading-10"
               style={{ textShadow: '2px 2px 12px rgba(0, 0, 0, 1)' }}
            >
               {title.length > 50 ? `${title.slice(0, 50)}...` : title}
            </h2>
         </div>

         {stats?.percent === 100 && (
            <div className="absolute top-2 right-2 z-10">
               <Check className="bg-secondary text-secondary-foreground rounded-full p-0.5 shadow-md" />
            </div>
         )}
      </Link>
   );
}
