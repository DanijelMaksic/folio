import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { RoleType } from '@/components/role-management/DemoteStaffTab';

interface RoleFilterProps {
   onSetRole: (status: RoleType) => void;
   role: RoleType;
}

function RoleFilter({ onSetRole, role }: RoleFilterProps) {
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
                     className="capitalize justify-between min-w-22"
                  >
                     {role === 'all' && 'all'}
                     {role === 'editor' && 'editor'}
                     {role === 'admin' && 'admin'}
                     <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSetRole('all')}>
                     All{' '}
                     {role === 'all' && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetRole('editor')}>
                     Editor
                     {role === 'editor' && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetRole('admin')}>
                     Admin
                     {role === 'admin' && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
               </DropdownMenuGroup>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
   );
}

export default RoleFilter;
