import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { isEditor } from '@shared';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';

type Cat = {
   id: string;
   name: string;
   documentCount: number;
   collectionCount: number;
};

export default function CategorySettings() {
   const utils = trpc.useUtils();
   const { data: categories = [], isLoading } = trpc.categories.list.useQuery();
   const navigate = useNavigate();
   const { data: session } = useSession();

   const [newName, setNewName] = useState('');
   const [editing, setEditing] = useState<{ id: string; name: string } | null>(
      null,
   );
   const [toDelete, setToDelete] = useState<Cat | null>(null);
   const [error, setError] = useState('');

   const refresh = () => {
      utils.categories.list.invalidate();
      utils.documents.list.invalidate();
      utils.collections.list.invalidate();
   };

   const create = trpc.categories.create.useMutation({
      onSuccess: () => {
         setNewName('');
         setError('');
         refresh();
      },
      onError: (e) => setError(e.message),
   });
   const update = trpc.categories.update.useMutation({
      onSuccess: () => {
         setEditing(null);
         setError('');
         refresh();
      },
      onError: (e) => setError(e.message),
   });
   const remove = trpc.categories.delete.useMutation({
      onSuccess: () => {
         setToDelete(null);
         setError('');
         refresh();
      },
      onError: (e) => setError(e.message),
   });

   if (!isEditor(session?.user.globalRole)) {
      navigate('/');
      return null;
   }

   if (isLoading) return <div>Loading...</div>;

   return (
      <div className="max-w-2xl mx-auto py-8 px-6 space-y-6">
         <h1 className="text-2xl font-semibold">Category settings</h1>

         <div className="flex gap-2">
            <Input
               value={newName}
               onChange={(e) => setNewName(e.target.value)}
               placeholder="New category name"
               maxLength={40}
            />
            <Button
               disabled={create.isPending || newName.trim().length < 2}
               onClick={() => create.mutate({ name: newName })}
            >
               Add
            </Button>
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium">Categories</h3>
            <span className="bg-secondary text-secondary-foreground text-lg px-2.5 rounded-md">
               {categories.length}
            </span>
         </div>

         {categories.length === 0 && (
            <p className="text-muted-foreground">No categories yet.</p>
         )}

         <ul className="divide-y border rounded-md">
            {categories.map((c) => (
               <li key={c.id} className="flex items-center gap-3 p-3">
                  {editing?.id === c.id ? (
                     <>
                        <Input
                           value={editing.name}
                           onChange={(e) =>
                              setEditing({ id: c.id, name: e.target.value })
                           }
                           maxLength={40}
                        />
                        <Button
                           size="sm"
                           disabled={
                              update.isPending || editing.name.trim().length < 2
                           }
                           onClick={() => update.mutate(editing)}
                        >
                           Save
                        </Button>
                        <Button
                           size="sm"
                           variant="outline"
                           onClick={() => setEditing(null)}
                        >
                           Cancel
                        </Button>
                     </>
                  ) : (
                     <>
                        <span className="flex-1">{c.name}</span>
                        <span className="text-sm text-muted-foreground">
                           {c.documentCount} docs · {c.collectionCount}{' '}
                           collections
                        </span>
                        <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                              setError('');
                              setEditing({ id: c.id, name: c.name });
                           }}
                        >
                           Rename
                        </Button>
                        <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => {
                              setError('');
                              setToDelete(c);
                           }}
                        >
                           Delete
                        </Button>
                     </>
                  )}
               </li>
            ))}
         </ul>

         <Dialog
            open={!!toDelete}
            onOpenChange={(o) => !o && !remove.isPending && setToDelete(null)}
         >
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">
                     Delete “{toDelete?.name}”?
                  </DialogTitle>
                  <DialogDescription>
                     {toDelete &&
                     toDelete.documentCount + toDelete.collectionCount > 0
                        ? `${toDelete.documentCount} documents and ${toDelete.collectionCount} collections will become uncategorized. Nothing else is deleted.`
                        : 'No documents or collections use this category.'}
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button
                     variant="outline"
                     onClick={() => setToDelete(null)}
                     disabled={remove.isPending}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="destructive"
                     disabled={remove.isPending}
                     onClick={() =>
                        toDelete && remove.mutate({ id: toDelete.id })
                     }
                  >
                     {remove.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
