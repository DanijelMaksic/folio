import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Collection, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';

export default function Collections() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const { data: collections, isLoading } = trpc.collections.list.useQuery({
      page: 1,
      limit: 20,
   });

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Collections</h1>
            {canTranscribe && (
               <Button onClick={() => navigate('/collections/create')}>
                  Create a collection
               </Button>
            )}
         </div>

         {!collections?.length ? (
            <p className="text-muted-foreground">No collections yet.</p>
         ) : (
            <div className="grid grid-cols-2 gap-4">
               {collections.map((collection: Collection) => (
                  <CollectionCard collection={collection} key={collection.id} />
               ))}
            </div>
         )}
      </div>
   );
}

function CollectionCard({ collection }: { collection: Collection }) {
   const { id, title, creatorName } = collection;

   return (
      <Link
         to={`/collections/${id}`}
         className="relative flex flex-col justify-between h-30 rounded-xl p-6 group cursor-pointer hover:translate-y-[-6px] transition duration-300 hover:shadow-2xl"
      >
         <span className="absolute -inset-px m-0 bg-linear-to-r from-gray-800 group-hover:from-gray-900 z-10 pointer-events-none rounded-xl md:rounded-2xl transition duration-300 group-hover:saturate-120" />

         {collection.coverImageUrl ? (
            <img
               src={collection.coverImageUrl}
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
