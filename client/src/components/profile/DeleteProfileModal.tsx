import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from '@/lib/auth-client';
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

interface DeleteProfileModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

function DeleteProfileModal({ open, onOpenChange }: DeleteProfileModalProps) {
   const navigate = useNavigate();
   const [password, setPassword] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [deleting, setDeleting] = useState(false);

   useEffect(() => {
      if (open) {
         setPassword('');
         setError(null);
      }
   }, [open]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!password || deleting) return;

      setError(null);
      setDeleting(true);
      const { error: deleteError } = await deleteUser({ password });

      if (deleteError) {
         setDeleting(false);
         setError(
            deleteError.code === 'INVALID_PASSWORD'
               ? 'Password is incorrect'
               : (deleteError.message ?? 'Could not delete your profile'),
         );
         return;
      }

      localStorage.removeItem('folio-viewer');
      navigate('/login', { replace: true });
   }

   return (
      <Dialog open={open} onOpenChange={deleting ? undefined : onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Delete profile
               </DialogTitle>
               <DialogDescription>
                  This permanently deletes your profile, your documents and
                  their pages. Approved transcriptions you made on other
                  people's documents stay, shown as "Deleted user". Everything
                  else you contributed is removed. This cannot be undone.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="delete-password">
                     Enter your password to confirm
                  </Label>
                  <Input
                     id="delete-password"
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     aria-invalid={!!error}
                     autoComplete="current-password"
                  />
                  {error && (
                     <p role="alert" className="text-sm text-destructive">
                        {error}
                     </p>
                  )}
               </div>

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={deleting}
                  >
                     Cancel
                  </Button>
                  <Button
                     type="submit"
                     variant="destructive"
                     disabled={!password || deleting}
                  >
                     {deleting ? 'Deleting...' : 'Delete my profile'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default DeleteProfileModal;
