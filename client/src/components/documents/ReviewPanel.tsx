import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { SubmittedTranscription } from '@shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ReviewPanel({
   submittedTranscription,
}: {
   submittedTranscription: SubmittedTranscription;
}) {
   const [rejectionReason, setRejectionReason] = useState('');
   const navigate = useNavigate();

   const approveMutation = trpc.transcriptions.approve.useMutation({
      onSuccess: () => {
         navigate('/review');
      },
   });

   const rejectMutation = trpc.transcriptions.reject.useMutation({
      onSuccess: () => {
         navigate('/review');
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
      <div className="border rounded-lg p-4 space-y-4">
         <h2 className="font-semibold">Review Transcription</h2>

         <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
            {submittedTranscription.content}
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
