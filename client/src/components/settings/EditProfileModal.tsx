import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { updateProfileSchema } from '@folio/shared';
import { zodResolver } from '@/lib/zod-resolver';
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

type EditProfileValues = { name: string; username: string };

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
   const {
      register,
      handleSubmit,
      reset,
      setError,
      watch,
      formState: { errors, isSubmitting, isDirty },
   } = useForm<EditProfileValues>({
      resolver: zodResolver(updateProfileSchema),
      defaultValues: { name: initialName, username: initialUsername },
   });

   const nameLength = watch('name')?.length ?? 0;
   const usernameLength = watch('username')?.length ?? 0;

   // Reset the form every time the modal opens
   useEffect(() => {
      if (open) reset({ name: initialName, username: initialUsername });
   }, [open, initialName, initialUsername, reset]);

   async function onSubmit(values: EditProfileValues) {
      // Only send what actually changed
      const changes: Partial<EditProfileValues> = {};
      if (values.name !== initialName) changes.name = values.name;
      if (values.username !== initialUsername)
         changes.username = values.username;

      const { error } = await updateUser(changes);

      if (error) {
         const message = error.message ?? 'Could not update profile';
         setError(/username/i.test(message) ? 'username' : 'root', {
            message,
         });
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
                  Edit profile
               </DialogTitle>
               <DialogDescription>
                  Update how your name appears across Folio.
               </DialogDescription>
            </DialogHeader>

            <form
               onSubmit={handleSubmit(onSubmit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                     id="profile-name"
                     autoComplete="name"
                     aria-invalid={!!errors.name}
                     aria-describedby={
                        errors.name ? 'profile-name-error' : undefined
                     }
                     {...register('name')}
                  />
                  <div className="flex justify-between text-sm">
                     <p className="text-destructive">{errors?.name?.message}</p>

                     {nameLength > 30 && (
                        <span
                           className={`${nameLength! <= 40 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {nameLength}/40
                        </span>
                     )}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="profile-username">Username</Label>
                  <Input
                     id="profile-username"
                     autoComplete="username"
                     aria-invalid={!!errors.username}
                     aria-describedby={
                        errors.username ? 'profile-username-error' : undefined
                     }
                     {...register('username')}
                  />
                  <div className="flex justify-between text-sm">
                     <p className="text-destructive">
                        {errors?.username?.message}
                     </p>

                     {usernameLength > 25 && (
                        <span
                           className={`${usernameLength! <= 30 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {usernameLength}/30
                        </span>
                     )}
                  </div>
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
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                     {isSubmitting ? 'Saving...' : 'Save changes'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default EditProfileModal;
