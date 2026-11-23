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
import { useState } from 'react';
import CategorySelect from '@/components/categories/CategorySelect';

interface EditModalProps {
   heading: string;
   initialTitle: string;
   initialDescription?: string;
   isPending: boolean;
   serverError?: string;
   hasDescription: boolean;
   onEdit: (values: EditFormInput, categoryId: string | null) => void;
   onClose: () => void;
   hasCategory?: boolean;
   initialCategoryId?: string | null;
}

function EditModal({
   heading,
   initialTitle,
   initialDescription = '',
   isPending,
   serverError,
   onEdit,
   onClose,
   hasDescription,
   hasCategory,
   initialCategoryId,
}: EditModalProps) {
   const {
      register,
      handleSubmit,
      watch,
      formState: { errors },
   } = useForm<EditFormInput>({
      resolver: zodResolver(editFormSchema),
      mode: 'onChange',
      defaultValues: {
         title: initialTitle,
         description: initialDescription,
      },
   });

   const [categoryId, setCategoryId] = useState(initialCategoryId ?? '');
   const categoryDirty =
      hasCategory && categoryId !== (initialCategoryId ?? '');

   const titleLength = watch('title')?.length ?? 0;
   const descriptionLength = watch('description')?.length ?? 0;

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
            </DialogHeader>

            <form
               onSubmit={handleSubmit((v) => onEdit(v, categoryId || null))}
               className={`space-y-4 ${isPending ? 'pointer-events-none opacity-65' : ''}`}
               noValidate
            >
               <div className="space-y-2">
                  <Label htmlFor="edit-title-field">Title</Label>
                  <Input
                     id="edit-title-field"
                     aria-invalid={!!errors.title}
                     {...register('title')}
                  />
                  <div className="flex justify-between text-sm">
                     <p className="text-destructive">
                        {errors?.title?.message}
                     </p>

                     {titleLength > 200 && (
                        <span
                           className={`${titleLength! <= 225 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                        >
                           {titleLength}/225
                        </span>
                     )}
                  </div>
               </div>

               {hasDescription && (
                  <div className="space-y-2">
                     <Label htmlFor="edit-description-field">Description</Label>
                     <Textarea
                        id="edit-description-field"
                        {...register('description')}
                        className="max-h-56 overflow-y-auto wrap-anywhere"
                     />
                     <div className="flex justify-between text-sm">
                        <p className="text-destructive">
                           {errors?.description?.message}
                        </p>

                        {descriptionLength > 900 && (
                           <span
                              className={`${descriptionLength! <= 1000 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                           >
                              {descriptionLength}/1000
                           </span>
                        )}
                     </div>
                  </div>
               )}

               {hasCategory && (
                  <div className="space-y-2">
                     <Label htmlFor="edit-category-field">Category</Label>
                     <CategorySelect
                        id="edit-category-field"
                        value={categoryId}
                        onChange={setCategoryId}
                     />
                  </div>
               )}

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
                  <Button
                     type="submit"
                     disabled={
                        isPending ||
                        descriptionLength! > 1000 ||
                        titleLength > 250
                     }
                  >
                     {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default EditModal;
