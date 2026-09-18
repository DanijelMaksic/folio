import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EllipsisVertical } from 'lucide-react';

interface ActionsMenuProps {
   show: boolean;
   onEdit: () => void;
   onDelete: () => void;
   onSaveToCollection?: () => void;
   inCollection?: boolean;
   testId?: string;
}

function ActionsMenu({
   show,
   onEdit,
   onDelete,
   onSaveToCollection,
   inCollection,
}: ActionsMenuProps) {
   if (!show) return null;

   return (
      <DropdownMenu>
         <DropdownMenuTrigger
            render={
               <Button
                  variant="outline"
                  data-testid="actions-dropdown-btn"
                  className="border-gray-400"
               >
                  <EllipsisVertical />
               </Button>
            }
         />
         <DropdownMenuContent>
            <DropdownMenuGroup>
               {onSaveToCollection && (
                  <DropdownMenuItem
                     onClick={onSaveToCollection}
                     data-testid="save-modal-btn"
                  >
                     {inCollection ? 'Manage' : 'Save'}
                  </DropdownMenuItem>
               )}

               <DropdownMenuItem onClick={onEdit} data-testid="edit-modal-btn">
                  Edit
               </DropdownMenuItem>
               <DropdownMenuItem
                  className="text-red-600 focus:bg-red-100 focus:text-red-700 transition-all"
                  data-testid="delete-modal-btn"
                  onClick={onDelete}
               >
                  Delete
               </DropdownMenuItem>
            </DropdownMenuGroup>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

export default ActionsMenu;
