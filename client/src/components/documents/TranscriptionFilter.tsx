import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusType } from '@/pages/DocumentPages';
import { Filter } from 'lucide-react';

interface TranscriptionFilterProps {
   onSetStatus: (status: StatusType) => void;
   status: StatusType;
}

function TranscriptionFilter({
   onSetStatus,
   status,
}: TranscriptionFilterProps) {
   return (
      <div className="flex items-center justify-center gap-2 w-44 border rounded-md">
         <span className="pl-1">
            <Filter className="text-gray-500" />
         </span>

         <DropdownMenu>
            <DropdownMenuTrigger
               render={
                  <Button variant="outline" className=" capitalize w-31">
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
