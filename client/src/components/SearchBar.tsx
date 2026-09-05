import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon } from 'lucide-react';

function SearchBar({
   placeholder,
   handler,
}: {
   placeholder: string;
   handler: Function;
}) {
   return (
      <ButtonGroup className="flex-1 max-w-sm">
         <Input
            placeholder="Search documents..."
            className="border-gray-400 w-full"
         />
         <Button
            variant="outline"
            aria-label="Search"
            className="border-gray-400"
         >
            <SearchIcon />
         </Button>
      </ButtonGroup>
   );
}

export default SearchBar;
