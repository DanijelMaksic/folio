import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '@server/trpc/router';
import CategorySelect from '@/components/categories/CategorySelect';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateCollection() {
   const navigate = useNavigate();
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [error, setError] = useState('');
   const [categoryId, setCategoryId] = useState('');

   const createCollection = trpc.collections.create.useMutation({
      onSuccess: (collection) => navigate(`/collections/${collection.id}`),
      onError: (err: TRPCClientErrorLike<AppRouter>) => setError(err.message),
   });

   const handleSubmit = async () => {
      createCollection.mutate({
         title,
         description,
         categoryId: categoryId || null,
      });
   };

   return (
      <div className="max-w-lg mx-auto p-6 space-y-4 border border-border rounded-md my-12">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Create a collection</h1>

            <Link to={navigate(-1)} className="flex items-center gap-1 group">
               <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
               <span className="text-sm">Back</span>
            </Link>
         </div>

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

         <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
               id="category"
               value={categoryId}
               onChange={setCategoryId}
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <Button
            onClick={handleSubmit}
            disabled={createCollection.isPending || !title}
         >
            {createCollection.isPending ? 'Creating...' : 'Create'}
         </Button>
      </div>
   );
}
