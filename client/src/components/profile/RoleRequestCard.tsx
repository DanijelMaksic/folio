import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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

   const targetRole = NEXT_ROLE[globalRole as keyof typeof NEXT_ROLE];
   // Editors and admins have nothing left to request
   if (!targetRole) return null;

   async function handleSubmit(message: string) {
      // TODO: replace with trpc.profile.requestRole.mutateAsync({ message })
      console.log('Role request:', targetRole, message);
   }

   return (
      <>
         <div className="flex items-center gap-4 rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:max-w-xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
               <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
               <p className="text-sm font-medium leading-snug">
                  {targetRole === 'contributor'
                     ? 'Want to help transcribe?'
                     : 'Ready to help review?'}
               </p>
               <Button size="sm" onClick={() => setOpen(true)}>
                  {targetRole === 'contributor' && 'Become a contributor'}
                  {targetRole === 'editor' && 'Become an editor'}
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
