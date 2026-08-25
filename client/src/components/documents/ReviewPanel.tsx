import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { SubmittedTranscription } from '@shared';
import { useState } from 'react';

function ReviewPanel({
   submittedTranscription,
}: {
   submittedTranscription: SubmittedTranscription;
}) {
   const [rejectionReason, setRejectionReason] = useState('');

   const utils = trpc.useUtils();

   const approveMutation = trpc.transcriptions.approve.useMutation({
      onSuccess: () => {
         utils.transcriptions.getByDocument.invalidate();
         utils.transcriptions.getSubmittedByDocument.invalidate();
      },
   });

   const rejectMutation = trpc.transcriptions.reject.useMutation({
      onSuccess: () => {
         utils.transcriptions.getByDocument.invalidate();
         utils.transcriptions.getSubmittedByDocument.invalidate();
      },
   });

   function handleApprove() {
      if (!submittedTranscription) return;
      approveMutation.mutate({ transcriptionId: submittedTranscription.id });
   }

   function handleReject() {
      if (!submittedTranscription) return;
      rejectMutation.mutate({
         transcriptionId: submittedTranscription.id,
         reason: rejectionReason,
      });
   }
   return (
      <div className="mt-6 border rounded-lg p-4 space-y-4">
         <h2 className="font-semibold">Review Transcription</h2>
         <p className="text-sm text-muted-foreground">
            Submitted by{' '}
            <span className="font-medium text-foreground">
               {submittedTranscription.user.username}
            </span>
         </p>
         <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
            {submittedTranscription.content}
         </div>
         <div
            data-testid="review-status"
            className="text-sm text-muted-foreground"
         >
            Status: {submittedTranscription.status}
         </div>
         <Button onClick={handleApprove} disabled={approveMutation.isPending}>
            Approve
         </Button>
         <div className="space-y-2">
            <Textarea
               placeholder="Rejection reason..."
               value={rejectionReason}
               onChange={(e) => setRejectionReason(e.target.value)}
            />
            <Button
               variant="destructive"
               onClick={handleReject}
               disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
               Reject
            </Button>
         </div>
      </div>
   );
}

export default ReviewPanel;
