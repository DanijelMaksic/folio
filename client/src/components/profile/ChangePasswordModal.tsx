import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { changePasswordSchema } from '@folio/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { changePassword } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type ChangePasswordValues = {
   currentPassword: string;
   newPassword: string;
   confirmPassword: string;
};

const emptyValues: ChangePasswordValues = {
   currentPassword: '',
   newPassword: '',
   confirmPassword: '',
};

interface ChangePasswordModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
   // Not part of the form: the schema would strip it from the parsed values
   const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);

   const {
      register,
      handleSubmit,
      reset,
      setError,
      watch,
      formState: { errors, isSubmitting },
   } = useForm<ChangePasswordValues>({
      resolver: zodResolver(changePasswordSchema),
      defaultValues: emptyValues,
   });

   const newPasswordLength = watch('newPassword')?.length ?? 0;

   // Reset the form every time the modal opens
   useEffect(() => {
      if (open) {
         reset(emptyValues);
         setRevokeOtherSessions(true);
      }
   }, [open, reset]);

   async function onSubmit(values: ChangePasswordValues) {
      const { error } = await changePassword({
         currentPassword: values.currentPassword,
         newPassword: values.newPassword,
         revokeOtherSessions,
      });

      if (error) {
         if (error.code === 'INVALID_PASSWORD') {
            setError('currentPassword', {
               message: 'Current password is incorrect',
            });
         } else {
            setError('root', {
               message: error.message ?? 'Could not change password',
            });
         }
         return;
      }

      onOpenChange(false);
   }

   return (
      <Dialog
         open={open}
         onOpenChange={isSubmitting ? undefined : onOpenChange}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Change password
               </DialogTitle>
               <DialogDescription>
                  Enter your current password and choose a new one.
               </DialogDescription>
            </DialogHeader>

            <form
               onSubmit={handleSubmit(onSubmit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                     id="current-password"
                     type="password"
                     autoComplete="current-password"
                     aria-invalid={!!errors.currentPassword}
                     aria-describedby={
                        errors.currentPassword
                           ? 'current-password-error'
                           : undefined
                     }
                     {...register('currentPassword')}
                  />
                  {errors.currentPassword && (
                     <p
                        id="current-password-error"
                        className="text-sm text-destructive"
                     >
                        {errors.currentPassword.message}
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                     id="new-password"
                     type="password"
                     autoComplete="new-password"
                     aria-invalid={!!errors.newPassword}
                     aria-describedby="new-password-hint"
                     {...register('newPassword')}
                  />

                  <div className="flex justify-between text-sm">
                     <p className="text-destructive" id="new-password-hint">
                        {errors?.newPassword?.message}
                     </p>

                     {newPasswordLength > 100 && (
                        <span
                           className={`${newPasswordLength! <= 128 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {newPasswordLength}/128
                        </span>
                     )}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                     id="confirm-password"
                     type="password"
                     autoComplete="new-password"
                     aria-invalid={!!errors.confirmPassword}
                     aria-describedby={
                        errors.confirmPassword
                           ? 'confirm-password-error'
                           : undefined
                     }
                     {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                     <p
                        id="confirm-password-error"
                        className="text-sm text-destructive"
                     >
                        {errors.confirmPassword.message}
                     </p>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  <Checkbox
                     id="revoke-sessions"
                     checked={revokeOtherSessions}
                     onCheckedChange={(checked) =>
                        setRevokeOtherSessions(checked === true)
                     }
                  />
                  <Label htmlFor="revoke-sessions" className="font-normal">
                     Sign out of all other devices
                  </Label>
               </div>

               {errors.root && (
                  <p className="text-sm text-destructive">
                     {errors.root.message}
                  </p>
               )}

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
                     {isSubmitting ? 'Saving...' : 'Change password'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default ChangePasswordModal;
