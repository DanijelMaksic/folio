import { useEffect, useState } from 'react';
import { changePasswordSchema } from '@folio/shared';
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

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

interface ChangePasswordModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
   const [errors, setErrors] = useState<FieldErrors>({});
   const [formError, setFormError] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);

   // Reset the form every time the modal opens
   useEffect(() => {
      if (open) {
         setCurrentPassword('');
         setNewPassword('');
         setConfirmPassword('');
         setRevokeOtherSessions(true);
         setErrors({});
         setFormError(null);
      }
   }, [open]);

   const canSubmit =
      !saving &&
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0;

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setFormError(null);

      const result = changePasswordSchema.safeParse({
         currentPassword,
         newPassword,
         confirmPassword,
      });

      if (!result.success) {
         const fieldErrors: FieldErrors = {};
         for (const issue of result.error.issues) {
            const key = issue.path[0] as FieldName;
            if (!fieldErrors[key]) fieldErrors[key] = issue.message;
         }
         setErrors(fieldErrors);
         return;
      }
      setErrors({});

      setSaving(true);
      const { error } = await changePassword({
         currentPassword: result.data.currentPassword,
         newPassword: result.data.newPassword,
         revokeOtherSessions,
      });
      setSaving(false);

      if (error) {
         if (error.code === 'INVALID_PASSWORD') {
            setErrors({ currentPassword: 'Current password is incorrect' });
         } else {
            setFormError(error.message ?? 'Could not change password');
         }
         return;
      }

      onOpenChange(false);
   }

   return (
      <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Change password
               </DialogTitle>
               <DialogDescription>
                  Enter your current password and choose a new one.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                     id="current-password"
                     type="password"
                     value={currentPassword}
                     onChange={(e) => setCurrentPassword(e.target.value)}
                     aria-invalid={!!errors.currentPassword}
                     aria-describedby={
                        errors.currentPassword
                           ? 'current-password-error'
                           : undefined
                     }
                     autoComplete="current-password"
                  />
                  {errors.currentPassword && (
                     <p
                        id="current-password-error"
                        className="text-sm text-destructive"
                     >
                        {errors.currentPassword}
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                     id="new-password"
                     type="password"
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     aria-invalid={!!errors.newPassword}
                     aria-describedby="new-password-hint"
                     autoComplete="new-password"
                  />
                  {errors.newPassword ? (
                     <p
                        id="new-password-hint"
                        className="text-sm text-destructive"
                     >
                        {errors.newPassword}
                     </p>
                  ) : (
                     <p
                        id="new-password-hint"
                        className="text-sm text-muted-foreground"
                     >
                        At least 8 characters, with a letter and a number.
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                     id="confirm-password"
                     type="password"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     aria-invalid={!!errors.confirmPassword}
                     aria-describedby={
                        errors.confirmPassword
                           ? 'confirm-password-error'
                           : undefined
                     }
                     autoComplete="new-password"
                  />
                  {errors.confirmPassword && (
                     <p
                        id="confirm-password-error"
                        className="text-sm text-destructive"
                     >
                        {errors.confirmPassword}
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

               {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
               )}

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={saving}
                  >
                     Cancel
                  </Button>
                  <Button type="submit" disabled={!canSubmit}>
                     {saving ? 'Saving...' : 'Change password'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default ChangePasswordModal;
