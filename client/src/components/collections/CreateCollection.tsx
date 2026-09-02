import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@server/trpc/router';
import { Collection } from '@shared';

export default function CreateCollection() {
   const navigate = useNavigate();
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [error, setError] = useState('');

   const createCollection = trpc.collections.create.useMutation({
      onSuccess: (collection: Collection) =>
         navigate(`/collections/${collection.id}`),
      onError: (err: TRPCClientError<AppRouter>) => setError(err.message),
   });

   const handleSubmit = async () => {
      createCollection.mutate({
         title,
         description,
      });
   };

   return (
      <div className="max-w-lg mx-auto p-6 space-y-4 border border-gray-200 rounded-md mt-12">
         <h1 className="text-2xl font-semibold">Create a collection</h1>

         <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
               id="title"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
            />
         </div>

         <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
               id="description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <Button onClick={handleSubmit} disabled={createCollection.isPending || !title}>
            {createCollection.isPending ? 'Creating...' : 'Create'}
         </Button>
      </div>
   );
}
