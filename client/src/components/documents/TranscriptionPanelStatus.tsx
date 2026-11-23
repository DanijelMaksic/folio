import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

function TranscriptionPanelStatus({
   status,
}: {
   status: 'draft' | 'submitted' | 'approved' | 'rejected';
}) {
   return (
      <div className="text-sm text-muted-foreground capitalize flex gap-2">
         <div className="italic self-end">
            <span>Status: </span>
            <span data-testid="transcription-status">{status}</span>
         </div>

         {status === 'submitted' && (
            <Tooltip>
               <TooltipTrigger
                  render={
                     <button
                        type="button"
                        className="border border-gray-300 rounded-full px-2 text-gray-600"
                     >
                        ?
                     </button>
                  }
               />
               <TooltipContent>
                  <p className="max-w-44">
                     Submitted transcriptions are reviewed by an editor before
                     they’re published.
                  </p>
               </TooltipContent>
            </Tooltip>
         )}
      </div>
   );
}

export default TranscriptionPanelStatus;
