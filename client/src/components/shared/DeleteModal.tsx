import { Button } from '@/components/ui/button';

interface DeleteModalProps {
   heading: string;
   error?: string;
   isPending: string;
   onDelete: () => void;
   onClose: () => void;
}

function DeleteModal({
   heading,
   error,
   isPending,
   onDelete,
   onClose,
}: DeleteModalProps) {
   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">{heading}</h2>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button
                  variant="outline"
                  onClick={() => {
                     onClose();
                  }}
               >
                  Cancel
               </Button>

               <Button
                  onClick={onDelete}
                  disabled={isPending}
                  className="bg-red-700"
               >
                  {isPending ? 'Deleting...' : 'Delete'}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default DeleteModal;
