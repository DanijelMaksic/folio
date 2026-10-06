import { useState } from 'react';
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

interface EditModalProps {
   heading: string;
   error?: string;
   title: string;
   description: string;
   isPending: boolean;
   onEdit: () => void;
   onClose: () => void;
   onTitleChange: (value: string) => void;
   onDescriptionChange: (value: string) => void;
}

function EditModal({
   heading,
   error,
   title,
   description,
   isPending,
   onEdit,
   onClose,
   onTitleChange,
   onDescriptionChange,
}: EditModalProps) {
   // The parents render this modal conditionally and set the values before
   // opening, so the props at mount time are the original values.
   const [initial] = useState({ title, description });

   const trimmedTitle = title.trim();
   const hasChanges =
      trimmedTitle !== initial.title.trim() ||
      description.trim() !== initial.description.trim();
   const canSave = hasChanges && trimmedTitle.length > 0 && !isPending;

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (canSave) onEdit();
   }

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

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="edit-title-field">Title</Label>
                  <Input
                     id="edit-title-field"
                     value={title}
                     onChange={(e) => onTitleChange(e.target.value)}
                     aria-invalid={trimmedTitle.length === 0}
                  />
                  {trimmedTitle.length === 0 && (
                     <p className="text-sm text-destructive">
                        Title is required
                     </p>
                  )}
               </div>

               <div className="space-y-2">
                  <Label htmlFor="edit-description-field">Description</Label>
                  <Textarea
                     id="edit-description-field"
                     value={description}
                     onChange={(e) => onDescriptionChange(e.target.value)}
                  />
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
                  <Button type="submit" disabled={!canSave}>
                     {isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default EditModal;
