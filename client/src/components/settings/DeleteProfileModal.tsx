import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@/lib/zod-resolver';
import { deleteUser } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteProfileFormInput, deleteProfileFormSchema } from '@shared';

interface DeleteProfileModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

function DeleteProfileModal({ open, onOpenChange }: DeleteProfileModalProps) {
   const navigate = useNavigate();

   const {
      register,
      handleSubmit,
      reset,
      setError,
      formState: { errors, isSubmitting },
   } = useForm<DeleteProfileFormInput>({
      resolver: zodResolver(deleteProfileFormSchema),
      defaultValues: { password: '' },
   });

   useEffect(() => {
      if (open) reset({ password: '' });
   }, [open, reset]);

   async function onSubmit({ password }: DeleteProfileFormInput) {
      const { error } = await deleteUser({ password });

      if (error) {
         setError('password', {
            message:
               error.code === 'INVALID_PASSWORD'
                  ? 'Password is incorrect'
                  : (error.message ?? 'Could not delete your profile'),
         });
         return;
      }

      localStorage.removeItem('folio-viewer');
      navigate('/sign-in', { replace: true });
   }

   return (
      <Dialog
         open={open}
         onOpenChange={isSubmitting ? undefined : onOpenChange}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Delete profile
               </DialogTitle>
               <DialogDescription>
                  This permanently deletes your profile, your documents and
                  their pages. Approved transcriptions you made on other
                  people's documents stay, shown as "Deleted user". Everything
                  else you contributed is removed. This cannot be undone.
               </DialogDescription>
            </DialogHeader>

            <form
               onSubmit={handleSubmit(onSubmit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="delete-password">
                     Enter your password to confirm
                  </Label>
                  <Input
                     id="delete-password"
                     type="password"
                     autoComplete="current-password"
                     aria-invalid={!!errors.password}
                     {...register('password')}
                  />
                  {errors.password && (
                     <p role="alert" className="text-sm text-destructive">
                        {errors.password.message}
                     </p>
                  )}
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
                  <Button
                     type="submit"
                     variant="destructive"
                     disabled={isSubmitting}
                  >
                     {isSubmitting ? 'Deleting...' : 'Delete my profile'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default DeleteProfileModal;
