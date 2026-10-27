import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { EditFormInput, editFormSchema } from '@shared';
import { zodResolver } from '@/lib/zod-resolver';

interface EditModalProps {
   heading: string;
   initialTitle: string;
   initialDescription?: string;
   isPending: boolean;
   serverError?: string;
   onEdit: (values: EditFormInput) => void;
   onClose: () => void;
}

function EditModal({
   heading,
   initialTitle,
   initialDescription = '',
   isPending,
   serverError,
   onEdit,
   onClose,
}: EditModalProps) {
   const {
      register,
      handleSubmit,
      formState: { errors, isDirty },
   } = useForm<EditFormInput>({
      resolver: zodResolver(editFormSchema),
      defaultValues: {
         title: initialTitle,
         description: initialDescription,
      },
   });

   return (
      <Dialog
         open
         onOpenChange={(open) => {
            if (!open && !isPending) onClose();
         }}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  {heading}
               </DialogTitle>
               <DialogDescription>
                  Update the title and description.
               </DialogDescription>
            </DialogHeader>

            <form
               onSubmit={handleSubmit(onEdit)}
               className="space-y-4"
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="edit-title-field">Title</Label>
                  <Input
                     id="edit-title-field"
                     aria-invalid={!!errors.title}
                     {...register('title')}
                  />
                  {errors.title && (
                     <p className="text-sm text-destructive">
                        {errors.title.message}
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="edit-description-field">Description</Label>
                  <Textarea
                     id="edit-description-field"
                     {...register('description')}
                  />
                  {errors.description && (
                     <p className="text-sm text-destructive">
                        {errors.description.message}
                     </p>
                  )}
               </div>

               {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
               )}

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={onClose}
                     disabled={isPending}
                  >
                     Cancel
                  </Button>
                  <Button type="submit" disabled={!isDirty || isPending}>
                     {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default EditModal;
