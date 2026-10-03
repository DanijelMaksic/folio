import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusType } from '@/pages/DocumentPages';

interface TranscriptionFilterProps {
   onSetStatus: (status: StatusType) => void;
   status: StatusType;
}

function TranscriptionFilter({
   onSetStatus,
   status,
}: TranscriptionFilterProps) {
   return (
      <div className="flex items-center justify-center gap-3 w-44">
         <span>Show:</span>

         <DropdownMenu>
            <DropdownMenuTrigger
               render={
                  <Button
                     variant="outline"
                     data-testid="actions-dropdown-btn"
                     className=" capitalize w-31"
                  >
                     {status === 'all-pages' && 'all pages'}
                     {status === 'transcribed' && 'transcribed'}
                     {status === 'not-transcribed' && 'not transcribed'}
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSetStatus('all-pages')}>
                     All Pages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus('transcribed')}>
                     Transcribed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => onSetStatus('not-transcribed')}
                     className="w-max"
                  >
                     Not Transcribed
                  </DropdownMenuItem>
               </DropdownMenuGroup>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
   );
}

export default TranscriptionFilter;
