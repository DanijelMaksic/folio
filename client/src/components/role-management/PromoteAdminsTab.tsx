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
import { Link } from 'react-router-dom';

type Editor = { id: string; username: string; name: string };

function PromoteAdmins() {
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
      <section className="space-y-3">
         <h2 className="text-xl font-medium">Promote editors to admin role</h2>

         {!editors?.length ? (
            <p className="text-sm text-muted-foreground">No editors.</p>
         ) : (
            <ul className="divide-y rounded-md border">
               {editors.map((e) => (
                  <li
                     key={e.id}
                     className="flex items-center justify-between gap-3 p-3"
                  >
                     <div className="flex items-center gap-3 text-sm">
                        {e.image ? (
                           <Link to={`/users/${e.username}`}>
                              <img
                                 src={e.image}
                                 alt={`${e.username}'s avatar`}
                                 className="group relative size-12 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none border-2"
                              />
                           </Link>
                        ) : (
                           <Link
                              to={`/users/${e.username}`}
                              className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase"
                           >
                              {e.username[0]}
                           </Link>
                        )}

                        <div className="flex flex-col text-sm">
                           <Link
                              to={`/users/${e.username}`}
                              className="font-medium text-[1rem] hover:underline"
                           >
                              {e.name}
                           </Link>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <Link
                           to={`/users/${e.username}`}
                           className="border rounded-md px-3 py-1 font-medium hover:bg-gray-50"
                        >
                           View profile
                        </Link>
                        <Button size="sm" onClick={() => setSelected(e)}>
                           Make admin
                        </Button>
                     </div>
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

export default PromoteAdmins;
