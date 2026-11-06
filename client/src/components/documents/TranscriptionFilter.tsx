import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StatusType } from '@/pages/DocumentPages';
import { Check, ChevronDown, Filter } from 'lucide-react';

interface TranscriptionFilterProps {
   onSetStatus: (status: StatusType) => void;
   status: StatusType;
}

function TranscriptionFilter({
   onSetStatus,
   status,
}: TranscriptionFilterProps) {
   return (
      <div className="flex items-center justify-between gap-3 border rounded-md">
         <span className="pl-3">
            <Filter className="text-gray-500" />
         </span>

         <DropdownMenu modal={false}>
            <DropdownMenuTrigger
               render={
                  <Button
                     variant="outline"
                     className="capitalize justify-between min-w-40"
                  >
                     {status === 'all-pages' && 'all pages'}
                     {status === 'transcribed' && 'transcribed'}
                     {status === 'not-transcribed' && 'not transcribed'}
                     <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSetStatus('all-pages')}>
                     All Pages{' '}
                     {status === 'all-pages' && (
                        <Check className="ml-auto size-4" />
                     )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetStatus('transcribed')}>
                     Transcribed
                     {status === 'transcribed' && (
                        <Check className="ml-auto size-4" />
                     )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => onSetStatus('not-transcribed')}
                  >
                     Not Transcribed
                     {status === 'not-transcribed' && (
                        <Check className="ml-auto size-4" />
                     )}
                  </DropdownMenuItem>
               </DropdownMenuGroup>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
   );
}

export default TranscriptionFilter;
