import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogDescription,
   DialogTitle,
} from '@/components/ui/dialog';

function SubmitModal({
   onClose,
   onSubmit,
   isPending,
   hasContent,
}: {
   onClose: () => void;
   onSubmit: () => void;
   isPending: boolean;
   hasContent: boolean;
}) {
   return (
      <Dialog
         open
         onOpenChange={(open) => {
            if (!open) onClose();
         }}
      >
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Are you sure you want to submit your transcription?
               </DialogTitle>

               <DialogDescription>
                  You won't be able to change your transcription after
                  submission. Submitted transcriptions are reviewed by an editor
                  before they’re published. If the transcription is rejected, or
                  if it's been approved but you want to correct it, you will be
                  able to write it again.
               </DialogDescription>
            </DialogHeader>

            <DialogFooter>
               <Button
                  type="submit"
                  disabled={isPending || !hasContent}
                  onClick={onSubmit}
               >
                  {isPending ? 'Submitting...' : 'Submit'}
               </Button>
               <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

export default SubmitModal;
