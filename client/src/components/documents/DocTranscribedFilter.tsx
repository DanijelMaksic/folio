import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { DocumentStatusType } from '@/pages/Documents';

interface Props {
   onSetStatus: (status: DocumentStatusType) => void;
   status: DocumentStatusType;
}

function DocTranscribedFilter({ onSetStatus, status }: Props) {
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
                     {status === 'all-documents' && 'all documents'}
                     {status === 'transcribed' && 'transcribed'}
                     {status === 'not-transcribed' && 'not transcribed'}
                     <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem
                     onClick={() => onSetStatus('all-documents')}
                  >
                     All documents{' '}
                     {status === 'all-documents' && (
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

export default DocTranscribedFilter;
