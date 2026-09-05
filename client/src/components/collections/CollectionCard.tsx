import { Collection } from '@shared';
import { Link } from 'react-router-dom';

export function CollectionCard({ collection }: { collection: Collection }) {
   const { id, title, creatorName, coverImageUrl } = collection;

   return (
      <Link
         to={`/collections/${id}`}
         className="relative flex flex-col justify-between h-30 rounded-xl p-6 group cursor-pointer hover:translate-y-[-6px] transition duration-300 hover:shadow-2xl"
      >
         <span className="absolute -inset-px m-0 bg-linear-to-r from-gray-800 group-hover:from-gray-900 z-10 pointer-events-none rounded-xl md:rounded-2xl transition duration-300 group-hover:saturate-120" />

         {coverImageUrl ? (
            <img
               src={coverImageUrl}
               alt="Document image"
               className="absolute inset-0 h-full w-full object-cover rounded-xl md:rounded-2xl"
            />
         ) : (
            <div className="absolute inset-0 bg-muted rounded-xl" />
         )}

         <span />

         <div className="z-20 space-y-0.5">
            <span className="space-x-2 text-sm text-gray-300/70">
               {creatorName}
            </span>

            <h2
               className="text-gray-50 text-xl font-medium font-title leading-9.5 2xl:leading-9 lg:leading-8 md:leading-10"
               style={{ textShadow: '2px 2px 12px rgba(0, 0, 0, 1)' }}
            >
               {title}
            </h2>
         </div>
      </Link>
   );
}
