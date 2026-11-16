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
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuGroup,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

type Staff = {
   id: string;
   username: string;
   name: string;
   globalRole: string;
};

function DemoteStaffTab() {
   const { data: session } = useSession();
   const currentUser = session?.user;

   const utils = trpc.useUtils();
   const [selectedUser, setSelectedUser] = useState<Staff | null>(null);
   const [selectedRole, setSelectedRole] = useState<
      'contributor' | 'editor' | 'admin'
   >('editor');

   const { data: staff, isLoading } = trpc.admin.listStaff.useQuery();

   const demote = trpc.admin.setUserRole.useMutation({
      onSuccess: () => {
         utils.admin.listStaff.invalidate();
         setSelectedUser(null);
      },
   });

   function close() {
      if (demote.isPending) return;
      demote.reset();
      setSelectedUser(null);
      setSelectedRole('editor');
   }

   if (isLoading) return null;

   return (
      <section className="space-y-3">
         <h3 className="text-xl font-medium">Editors and admins</h3>

         {!staff?.length ? (
            <p className="text-sm text-muted-foreground">No staff.</p>
         ) : (
            <ul className="divide-y rounded-md border">
               {staff.map((s) => (
                  <li
                     key={s.id}
                     className="flex items-center justify-between gap-3 p-3"
                  >
                     <div className="flex items-center gap-3 text-sm">
                        {s.image ? (
                           <Link to={`/users/${s.username}`}>
                              <img
                                 src={s.image}
                                 alt={`${s.username}'s avatar`}
                                 className="group relative size-12 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none border-2"
                              />
                           </Link>
                        ) : (
                           <Link
                              to={`/users/${s.username}`}
                              className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium uppercase"
                           >
                              {s.username[0]}
                           </Link>
                        )}

                        <div className="flex flex-col text-sm">
                           <Link
                              to={`/users/${s.username}`}
                              className="font-medium text-[1rem] hover:underline"
                           >
                              {s.name}
                           </Link>
                        </div>

                        <span className="border border-gray-300 px-2.5 py-0.5 rounded-full text-gray-600">
                           {s.globalRole}
                        </span>
                     </div>

                     <div className="flex items-center gap-3">
                        <Link
                           to={`/users/${s.username}`}
                           className="border rounded-md px-3 py-1 font-medium hover:bg-gray-50"
                        >
                           View profile
                        </Link>

                        {s.id === currentUser?.id ? (
                           <Tooltip>
                              <TooltipTrigger
                                 render={
                                    <span tabIndex={0} className="inline-block">
                                       <Button
                                          size="sm"
                                          disabled
                                          className="pointer-events-none"
                                       >
                                          Demote
                                       </Button>
                                    </span>
                                 }
                              />
                              <TooltipContent>
                                 <p>You cannot demote yourself</p>
                              </TooltipContent>
                           </Tooltip>
                        ) : (
                           <Button
                              size="sm"
                              disabled={
                                 demote.isPending || s.id === currentUser?.id
                              }
                              onClick={() => setSelectedUser(s)}
                           >
                              Demote
                           </Button>
                        )}
                     </div>
                  </li>
               ))}
            </ul>
         )}

         <Dialog
            open={!!selectedUser}
            onOpenChange={(open) => !open && close()}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>
                     {selectedUser?.globalRole === 'editor'
                        ? `Demote @${selectedUser?.username} to contributor role?`
                        : `Demote @${selectedUser?.username} to lower role?`}
                  </DialogTitle>
                  <DialogDescription>
                     {selectedUser?.globalRole === 'editor'
                        ? `@${selectedUser?.username} will lose their editor privileges after demotion. They will be able to request editor role again.`
                        : `@${selectedUser?.username} will lose their admin privileges after demotion. They can be demoted to either editor or contributor role.`}{' '}
                     The change is recorded in the audit log.
                  </DialogDescription>
               </DialogHeader>

               {selectedUser?.globalRole === 'admin' && (
                  <div className="flex items-center gap-3">
                     <span className="font-medium">Demote to:</span>

                     <DropdownMenu>
                        <DropdownMenuTrigger
                           render={
                              <Button
                                 variant="outline"
                                 className="justify-between min-w-20 capitalize"
                              >
                                 {selectedRole}
                                 <ChevronDown className="size-4 text-muted-foreground" />
                              </Button>
                           }
                        />

                        <DropdownMenuContent>
                           <DropdownMenuGroup>
                              <DropdownMenuItem
                                 onClick={() => setSelectedRole('editor')}
                              >
                                 Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                 onClick={() => setSelectedRole('contributor')}
                              >
                                 Contributor
                              </DropdownMenuItem>
                           </DropdownMenuGroup>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               )}

               {demote.error && (
                  <p className="text-sm text-destructive">
                     {demote.error.message}
                  </p>
               )}

               <DialogFooter>
                  <Button
                     variant="outline"
                     onClick={close}
                     disabled={demote.isPending}
                  >
                     Cancel
                  </Button>

                  {selectedUser?.globalRole === 'editor' && (
                     <Button
                        disabled={
                           demote.isPending ||
                           selectedUser.id === currentUser?.id
                        }
                        onClick={() =>
                           demote.mutate({
                              userId: selectedUser?.id,
                              role: 'contributor',
                           })
                        }
                     >
                        {demote.isPending ? 'Demoting...' : 'Demote staff'}
                     </Button>
                  )}

                  {selectedUser?.globalRole === 'admin' && (
                     <Button
                        disabled={
                           demote.isPending ||
                           selectedUser.id === currentUser?.id
                        }
                        onClick={() =>
                           demote.mutate({
                              userId: selectedUser?.id,
                              role: selectedRole,
                           })
                        }
                     >
                        {demote.isPending ? 'Demoting...' : 'Demote staff'}
                     </Button>
                  )}
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </section>
   );
}

export default DemoteStaffTab;
