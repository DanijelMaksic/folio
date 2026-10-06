import { useEffect, useState } from 'react';
import { updateProfileSchema } from '@folio/shared';
import { updateUser } from '@/lib/auth-client';
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

type FieldErrors = Partial<Record<'name' | 'username', string>>;

interface EditProfileModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   initialName: string;
   initialUsername: string;
}

function EditProfileModal({
   open,
   onOpenChange,
   initialName,
   initialUsername,
}: EditProfileModalProps) {
   const [name, setName] = useState(initialName);
   const [username, setUsername] = useState(initialUsername);
   const [errors, setErrors] = useState<FieldErrors>({});
   const [formError, setFormError] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);

   // Reset the form every time the modal opens
   useEffect(() => {
      if (open) {
         setName(initialName);
         setUsername(initialUsername);
         setErrors({});
         setFormError(null);
      }
   }, [open, initialName, initialUsername]);

   const hasChanges =
      name.trim() !== initialName || username.trim() !== initialUsername;

   async function handleSubmit(e: React.SubmitEvent) {
      e.preventDefault();
      setFormError(null);

      const result = updateProfileSchema.safeParse({ name, username });
      if (!result.success) {
         const fieldErrors: FieldErrors = {};
         for (const issue of result.error.issues) {
            const key = issue.path[0] as keyof FieldErrors;
            if (!fieldErrors[key]) fieldErrors[key] = issue.message;
         }
         setErrors(fieldErrors);
         return;
      }
      setErrors({});

      // Only send what actually changed
      const changes: Partial<typeof result.data> = {};
      if (result.data.name !== initialName) changes.name = result.data.name;
      if (result.data.username !== initialUsername)
         changes.username = result.data.username;

      setSaving(true);
      const { error } = await updateUser(changes);
      setSaving(false);

      if (error) {
         const message = error.message ?? 'Could not update profile';
         if (/username/i.test(message)) {
            setErrors({ username: message });
         } else {
            setFormError(message);
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
                  Edit profile
               </DialogTitle>
               <DialogDescription>
                  Update how your name appears across Folio.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                     id="profile-name"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     aria-invalid={!!errors.name}
                     aria-describedby={
                        errors.name ? 'profile-name-error' : undefined
                     }
                     autoComplete="name"
                  />
                  {errors.name && (
                     <p
                        id="profile-name-error"
                        className="text-sm text-destructive"
                     >
                        {errors.name}
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="profile-username">Username</Label>
                  <Input
                     id="profile-username"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     aria-invalid={!!errors.username}
                     aria-describedby={
                        errors.username ? 'profile-username-error' : undefined
                     }
                     autoComplete="username"
                  />
                  {errors.username && (
                     <p
                        id="profile-username-error"
                        className="text-sm text-destructive"
                     >
                        {errors.username}
                     </p>
                  )}
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
                  <Button type="submit" disabled={saving || !hasChanges}>
                     {saving ? 'Saving...' : 'Save changes'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default EditProfileModal;
