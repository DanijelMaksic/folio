import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { RoleChangeType } from '@/components/role-management/AuditLogTab';

interface Props {
   onSetType: (type: RoleChangeType) => void;
   type: RoleChangeType;
}

function RoleChangeTypeFilter({ onSetType, type }: Props) {
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
                     className="justify-between min-w-28"
                  >
                     {type === 'all' && 'All'}
                     {type === 'promotion' && 'Promotion'}
                     {type === 'demotion' && 'Demotion'}
                     <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
               }
            />
            <DropdownMenuContent>
               <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSetType('all')}>
                     All{' '}
                     {type === 'all' && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetType('promotion')}>
                     Promotion
                     {type === 'promotion' && (
                        <Check className="ml-auto size-4" />
                     )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetType('demotion')}>
                     Demotion
                     {type === 'demotion' && (
                        <Check className="ml-auto size-4" />
                     )}
                  </DropdownMenuItem>
               </DropdownMenuGroup>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
   );
}

export default RoleChangeTypeFilter;
