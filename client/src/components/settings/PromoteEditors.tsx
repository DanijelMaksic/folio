import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';

type Editor = { id: string; username: string; name: string };

function PromoteEditors() {
   const utils = trpc.useUtils();
   const [selected, setSelected] = useState<Editor | null>(null);

   const { data: editors, isLoading } = trpc.admin.listEditors.useQuery();

   const promote = trpc.admin.setUserRole.useMutation({
      onSuccess: () => {
         utils.admin.listEditors.invalidate();
         setSelected(null);
      },
   });

   function close() {
      if (promote.isPending) return;
      promote.reset();
      setSelected(null);
   }

   if (isLoading) return null;

   return (
      <section className="space-y-3 mt-8">
         <h2 className="text-xl font-medium">Promote editors to admin</h2>

         {!editors?.length ? (
            <p className="text-sm text-muted-foreground">No editors.</p>
         ) : (
            <ul className="divide-y rounded-md border">
               {editors.map((e) => (
                  <li
                     key={e.id}
                     className="flex items-center justify-between gap-3 p-3"
                  >
                     <div className="text-sm">
                        <p className="font-medium">{e.name}</p>
                        <p className="text-muted-foreground">@{e.username}</p>
                     </div>

                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(e)}
                     >
                        Make admin
                     </Button>
                  </li>
               ))}
            </ul>
         )}

         <Dialog open={!!selected} onOpenChange={(open) => !open && close()}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>
                     Make @{selected?.username} an admin?
                  </DialogTitle>
                  <DialogDescription>
                     Admins can change roles and review role requests. They will
                     be signed out and must sign in again with an email code.
                     The change is recorded in the role log.
                  </DialogDescription>
               </DialogHeader>

               {promote.error && (
                  <p className="text-sm text-destructive">
                     {promote.error.message}
                  </p>
               )}

               <DialogFooter>
                  <Button
                     variant="outline"
                     onClick={close}
                     disabled={promote.isPending}
                  >
                     Cancel
                  </Button>
                  <Button
                     disabled={promote.isPending}
                     onClick={() =>
                        selected &&
                        promote.mutate({ userId: selected.id, role: 'admin' })
                     }
                  >
                     {promote.isPending ? 'Promoting...' : 'Make admin'}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </section>
   );
}

export default PromoteEditors;
