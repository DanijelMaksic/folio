import { trpc } from '@/lib/trpc';
import { useParams } from 'react-router-dom';

function CollectionDetails() {
   const { id } = useParams<{ id: string }>();

   const { data: collection, isLoading } = trpc.collections.getById.useQuery({
      id: id!,
   });

   if (isLoading) return <p>Loading...</p>;

   if (!collection) return <p>Collection not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <h1 className="text-2xl font-semibold">{collection.title}</h1>

         <p>{collection.description}</p>
      </div>
   );
}

export default CollectionDetails;
