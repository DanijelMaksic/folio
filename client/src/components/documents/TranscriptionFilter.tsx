import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function TranscriptionFilter() {
   const [status, setStatus] = useState<
      'all documents' | 'transcribed' | 'not transcribed'
   >('all documents');

   return (
      <div className="flex items-center justify-center gap-3">
         <span>Show:</span>

         <DropdownMenu>
            <DropdownMenuTrigger
               render={
                  <Button
                     variant="outline"
                     data-testid="actions-dropdown-btn"
                     className=" capitalize"
                  >
                     {status}
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setStatus('all documents')}>
                     All Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('transcribed')}>
                     Transcribed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => setStatus('not transcribed')}
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
