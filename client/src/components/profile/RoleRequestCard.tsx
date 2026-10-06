import { useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import RequestRoleModal from '@/components/profile/RequestRoleModal';

const NEXT_ROLE = {
   viewer: 'contributor',
   contributor: 'editor',
} as const;

interface RoleRequestCardProps {
   globalRole: string;
}

function RoleRequestCard({ globalRole }: RoleRequestCardProps) {
   const [open, setOpen] = useState(false);
   const utils = trpc.useUtils();

   const targetRole = NEXT_ROLE[globalRole as keyof typeof NEXT_ROLE];

   const { data: latest } = trpc.profile.getMyRoleRequest.useQuery(undefined, {
      enabled: !!targetRole,
   });
   const requestRole = trpc.profile.requestRole.useMutation();

   // Editors and admins have nothing left to request
   if (!targetRole) return null;

   async function handleSubmit(message: string) {
      await requestRole.mutateAsync({ message });
      await utils.profile.getMyRoleRequest.invalidate();
   }

   if (latest?.status === 'pending') {
      return (
         <div className="flex items-center gap-4 rounded-xl border p-4 sm:max-w-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
               <Clock className="size-5" />
            </div>
            <div className="min-w-0">
               <p className="text-sm font-medium leading-snug">
                  Request pending
               </p>
               <p className="text-sm text-muted-foreground">
                  Your {latest.requestedRole} request is awaiting review.
               </p>
            </div>
         </div>
      );
   }

   const wasRejected =
      latest?.status === 'rejected' && latest.requestedRole === targetRole;

   return (
      <>
         <div className="flex items-center gap-4 rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:max-w-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
               <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
               <div>
                  <p className="text-sm font-medium leading-snug">
                     {wasRejected
                        ? 'Your last request was declined'
                        : targetRole === 'contributor'
                          ? 'Want to help transcribe?'
                          : 'Ready to help review?'}
                  </p>
                  {wasRejected && latest.rejectionReason && (
                     <p className="mt-1 text-xs text-muted-foreground">
                        {latest.rejectionReason}
                     </p>
                  )}
               </div>
               <Button size="sm" onClick={() => setOpen(true)}>
                  {wasRejected ? 'Request again' : `Become a ${targetRole}`}
               </Button>
            </div>
         </div>

         <RequestRoleModal
            open={open}
            onOpenChange={setOpen}
            targetRole={targetRole}
            onSubmit={handleSubmit}
         />
      </>
   );
}

export default RoleRequestCard;
