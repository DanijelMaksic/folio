import { useEffect, useState } from 'react';
import { requestRoleSchema } from '@folio/shared';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MAX_LENGTH = 1000;

interface RequestRoleModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   targetRole: 'contributor' | 'editor';
   onSubmit: (message: string) => Promise<void>;
}

function RequestRoleModal({
   open,
   onOpenChange,
   targetRole,
   onSubmit,
}: RequestRoleModalProps) {
   const [message, setMessage] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (open) {
         setMessage('');
         setError(null);
      }
   }, [open]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      const result = requestRoleSchema.safeParse({ message });
      if (!result.success) {
         setError(result.error.issues[0].message);
         return;
      }

      setSaving(true);
      try {
         await onSubmit(result.data.message);
         onOpenChange(false);
      } catch (err) {
         setError(
            err instanceof Error ? err.message : 'Could not send your request',
         );
      } finally {
         setSaving(false);
      }
   }

   return (
      <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle className="text-lg font-semibold">
                  Request {targetRole} access
               </DialogTitle>
               <DialogDescription>
                  {targetRole === 'contributor'
                     ? 'Contributors can upload documents and submit transcriptions.'
                     : 'Editors can review transcriptions and manage any document or collection.'}{' '}
                  Tell us why you'd like this role.
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
               <div className="space-y-2">
                  <Label htmlFor="role-request-message">Your request</Label>
                  <Textarea
                     id="role-request-message"
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                     maxLength={MAX_LENGTH}
                     rows={6}
                     placeholder="What would you like to work on, and what experience do you have with historical documents?"
                     aria-invalid={!!error}
                  />
                  <div className="flex justify-between text-sm">
                     <span className="text-destructive">{error}</span>
                     <span className="text-muted-foreground tabular-nums">
                        {message.length}/{MAX_LENGTH}
                     </span>
                  </div>
               </div>

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={saving}
                  >
                     Cancel
                  </Button>
                  <Button
                     type="submit"
                     disabled={saving || message.trim().length === 0}
                  >
                     {saving ? 'Sending...' : 'Send request'}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

export default RequestRoleModal;
