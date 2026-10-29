import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
   RejectFormInput,
   rejectFormSchema,
   SubmittedTranscription,
} from '@shared';
import { zodResolver } from '@/lib/zod-resolver';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function ReviewPanel({
   submittedTranscription,
   pageId,
}: {
   submittedTranscription: SubmittedTranscription;
   pageId: string;
}) {
   const navigate = useNavigate();

   const {
      register,
      handleSubmit,
      setError,
      watch,
      formState: { errors },
   } = useForm<RejectFormInput>({
      resolver: zodResolver(rejectFormSchema),
      defaultValues: { reason: '' },
   });

   const reasonLength = watch('reason').length;

   const approveMutation = trpc.transcriptions.approve.useMutation({
      onSuccess: () => navigate('/review'),
      onError: (err) => setError('root', { message: err.message }),
   });

   const rejectMutation = trpc.transcriptions.reject.useMutation({
      onSuccess: () => navigate('/review'),
      onError: (err) => setError('reason', { message: err.message }),
   });

   const busy = approveMutation.isPending || rejectMutation.isPending;

   function handleApprove() {
      approveMutation.mutate({
         transcriptionId: submittedTranscription.id,
         pageId: pageId,
      });
   }

   function onReject({ reason }: RejectFormInput) {
      rejectMutation.mutate({
         transcriptionId: submittedTranscription.id,
         reason,
      });
   }

   return (
      <div className="border rounded-lg p-4 space-y-4">
         <h2 className="font-semibold">Review Transcription</h2>

         <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
            {submittedTranscription.content}
         </div>

         <Button onClick={handleApprove} disabled={busy}>
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
         </Button>
         {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
         )}

         <form
            onSubmit={handleSubmit(onReject)}
            className="space-y-2"
            noValidate
         >
            <Textarea
               placeholder="Rejection reason..."
               rows={4}
               aria-invalid={!!errors.reason}
               {...register('reason')}
            />
            <div className="flex justify-between text-sm">
               <p className="text-destructive">{errors?.reason?.message}</p>

               {reasonLength > 900 && (
                  <span
                     className={`${reasonLength! <= 1000 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                  >
                     {reasonLength}/1000
                  </span>
               )}
            </div>
            <Button type="submit" variant="destructive" disabled={busy}>
               {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
         </form>
      </div>
   );
}

export default ReviewPanel;
