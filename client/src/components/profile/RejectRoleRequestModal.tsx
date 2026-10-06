import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MAX_LENGTH = 500;

interface RejectRoleRequestModalProps {
   open: boolean;
   applicant: string;
   isPending: boolean;
   error?: string;
   onConfirm: (reason: string) => void;
   onClose: () => void;
}

function RejectRoleRequestModal({
   open,
   applicant,
   isPending,
   error,
   onConfirm,
   onClose,
}: RejectRoleRequestModalProps) {
   const [reason, setReason] = useState('');

   useEffect(() => {
      if (open) setReason('');
   }, [open]);

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!isPending) onConfirm(reason.trim());
   }

   return (
      <Dialog
         open={open}
         onOpenChange={(next) => {
            if (!next && !isPending) onClose();
         }}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>Reject request</DialogTitle>
               <DialogDescription>
                  {applicant} will be notified by email. You can include a
                  reason, but it's optional.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="reject-reason">Reason (optional)</Label>
                  <Textarea
                     id="reject-reason"
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     maxLength={MAX_LENGTH}
                     rows={4}
                  />
                  <p className="text-right text-sm text-muted-foreground tabular-nums">
                     {reason.length}/{MAX_LENGTH}
                  </p>
               </div>

               {error && <p className="text-sm text-destructive">{error}</p>}

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={onClose}
                     disabled={isPending}
                  >
                     Cancel
                  </Button>
                  <Button
                     type="submit"
                     variant="destructive"
                     disabled={isPending}
                  >
                     {isPending ? 'Rejecting...' : 'Reject request'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default RejectRoleRequestModal;
