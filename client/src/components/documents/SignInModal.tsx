import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

function SignInModal({
   onClose,
   label,
}: {
   onClose: () => void;
   label: string;
}) {
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
                  Sign in to {label}
               </DialogTitle>
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
