import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { requestRoleSchema } from '@folio/shared';
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

type RequestRoleValues = { message: string };

interface RequestRoleModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   targetRole: 'contributor' | 'editor';
   onSubmit: (message: string) => Promise<void>;
}

function RequestRoleModal({
   open,
   onOpenChange,
   targetRole,
   onSubmit,
}: RequestRoleModalProps) {
   const {
      register,
      handleSubmit,
      reset,
      setError,
      watch,
      formState: { errors, isSubmitting },
   } = useForm<RequestRoleValues>({
      resolver: zodResolver(requestRoleSchema),
      defaultValues: { message: '' },
   });

   const messageLength = watch('message').length;

   useEffect(() => {
      if (open) reset({ message: '' });
   }, [open, reset]);

   async function submit(values: RequestRoleValues) {
      try {
         await onSubmit(values.message);
         onOpenChange(false);
      } catch (err) {
         setError('message', {
            message:
               err instanceof Error
                  ? err.message
                  : 'Could not send your request',
         });
      }
   }

   return (
      <Dialog
         open={open}
         onOpenChange={isSubmitting ? undefined : onOpenChange}
      >
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Request {targetRole} access
               </DialogTitle>
               <DialogDescription>
                  {targetRole === 'contributor'
                     ? 'Contributors can upload documents and submit transcriptions.'
                     : 'Editors can review transcriptions and manage any document or collection.'}{' '}
                  Tell us why you'd like this role.
               </DialogDescription>
            </DialogHeader>

            <form
               onSubmit={handleSubmit(submit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="role-request-message">Your request</Label>
                  <Textarea
                     id="role-request-message"
                     rows={6}
                     placeholder="What would you like to work on, and what experience do you have with historical documents?"
                     aria-invalid={!!errors.message}
                     {...register('message')}
                  />
                  <div className="flex justify-between text-sm">
                     <span className="text-destructive">
                        {errors.message?.message}
                     </span>
                     {messageLength > 900 && (
                        <span
                           className={`${messageLength! <= 1000 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {messageLength}/1000
                        </span>
                     )}
                  </div>
               </div>

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={isSubmitting}
                  >
                     Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting ? 'Sending...' : 'Send request'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default RequestRoleModal;
