import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogDescription,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

function SignInModal({ onClose }: { onClose: () => void }) {
   const navigate = useNavigate();

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
                  Sign in to write notes
               </DialogTitle>
               <DialogDescription>
                  You will also need to become a contrubutor in order to post
                  notes
               </DialogDescription>
            </DialogHeader>

            <DialogFooter>
               <Button type="button" onClick={() => navigate('/sign-in')}>
                  Sign in
               </Button>
               <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

export default SignInModal;
