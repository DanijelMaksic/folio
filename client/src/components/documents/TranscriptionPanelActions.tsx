import { Checkbox } from '@/components/ui/checkbox';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
   isSubmitted: boolean;
   preview: boolean;
   isBlank: boolean;
   setIsBlank: (value: boolean) => void;
   setPreview: (value: boolean) => void;
   isSaving: boolean;
   transcriptionContent: string;
   handleSave: () => void;
   hasContent: boolean;
   setIsSubmitOpen: (value: boolean) => void;
   isSubmitting: boolean;
}

function TranscriptionPanelActions({
   isSubmitted,
   preview,
   isBlank,
   setIsBlank,
   setPreview,
   isSaving,
   transcriptionContent,
   handleSave,
   hasContent,
   setIsSubmitOpen,
   isSubmitting,
}: Props) {
   return (
      <div className="flex gap-2 items-center justify-end shrink-0">
         {' '}
         {!isSubmitted && (
            <>
               {!preview && (
                  <div className="flex items-center gap-2 mr-4">
                     <span>Mark as blank</span>
                     <Checkbox
                        onCheckedChange={(v) => setIsBlank(v === true)}
                        className="border-gray-400"
                        id="blank-checkbox"
                        name="blank-checkbox"
                        checked={isBlank}
                     />
                  </div>
               )}

               <button
                  className="px-3 py-1 text-sm border disabled:pointer-events-none rounded hover:bg-muted disabled:opacity-50"
                  onClick={() => setPreview(!preview)}
                  disabled={isSaving || !transcriptionContent.trim() || isBlank}
               >
                  {preview ? 'Edit' : 'Preview'}
               </button>

               <Tooltip>
                  <TooltipTrigger
                     render={
                        <button
                           className="px-3 py-1 text-sm border disabled:pointer-events-none rounded hover:bg-muted disabled:opacity-50"
                           onClick={handleSave}
                           disabled={isSaving || !hasContent}
                        >
                           {isSaving ? 'Saving...' : 'Save'}
                        </button>
                     }
                  />
                  <TooltipContent>
                     <p className="max-w-44">
                        {' '}
                        {navigator.platform === 'Win32' ? 'Ctrl+S' : 'Cmd+S'}
                     </p>
                  </TooltipContent>
               </Tooltip>

               <button
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground disabled:pointer-events-none rounded  hover:opacity-90 disabled:opacity-50"
                  onClick={() => setIsSubmitOpen(true)}
                  disabled={isSubmitting || !hasContent}
               >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
               </button>
            </>
         )}
      </div>
   );
}

export default TranscriptionPanelActions;
