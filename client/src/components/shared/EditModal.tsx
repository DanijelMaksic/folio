import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">{heading}</h2>

            <div className="space-y-2">
               <label
                  className="text-sm font-medium"
                  htmlFor="edit-title-field"
               >
                  Title
               </label>
               <Input
                  value={title}
                  id="edit-title-field"
                  onChange={(e) => onTitleChange(e.target.value)}
               />
            </div>

            <div className="space-y-2">
               <label
                  className="text-sm font-medium"
                  htmlFor="edit-description-field"
               >
                  Description
               </label>
               <Textarea
                  value={description}
                  id="edit-description-field"
                  onChange={(e) => onDescriptionChange(e.target.value)}
               />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>
                  Cancel
               </Button>

               <Button onClick={onEdit} disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save'}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default EditModal;
