import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/zod-resolver';
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
import { rejectRoleRequestFormSchema, RejectRoleRequestInput } from '@shared';

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
   const {
      register,
      handleSubmit,
      reset,
      watch,
      formState: { errors },
   } = useForm<RejectRoleRequestInput>({
      resolver: zodResolver(rejectRoleRequestFormSchema),
      defaultValues: { reason: '' },
   });

   const reasonLength = watch('reason').length;

   useEffect(() => {
      if (open) reset({ reason: '' });
   }, [open, reset]);

   function onSubmit({ reason }: RejectRoleRequestInput) {
      if (!isPending) onConfirm(reason);
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

            <form
               onSubmit={handleSubmit(onSubmit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="reject-reason">Reason (optional)</Label>
                  <Textarea
                     id="reject-reason"
                     rows={4}
                     aria-invalid={!!errors.reason}
                     {...register('reason')}
                  />
                  <div className="flex justify-between text-sm">
                     <span className="text-destructive">
                        {errors.reason?.message}
                     </span>
                     {reasonLength > 400 && (
                        <span
                           className={`${reasonLength! <= 500 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {reasonLength}/500
                        </span>
                     )}
                  </div>
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
