import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon } from 'lucide-react';

function SearchBar({
   placeholder,
   onChange,
   value,
}: {
   placeholder: string;
   onChange: (value: string) => void;
   value: string;
}) {
   return (
      <ButtonGroup className="flex-1 max-w-sm">
         <Input
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            value={value}
            data-testid="search-bar"
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
