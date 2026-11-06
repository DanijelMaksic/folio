import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import SearchBar from '@/components/shared/SearchBar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function ListControls({
   placeholder,
   input,
   onInput,
   sort,
   onSort,
   options,
}: {
   placeholder: string;
   input: string;
   onInput: (v: string) => void;
   sort: string;
   onSort: (v: string) => void;
   options: { value: string; label: string }[];
}) {
   const [selectedOption, setSelectedOption] = useState('Newest');

   return (
      <div className="flex items-center justify-between gap-3 my-5">
         <SearchBar
            placeholder={placeholder}
            value={input}
            onChange={onInput}
         />
         <div className="flex items-center gap-2 border rounded-md">
            <span className="pl-3">
               <ArrowUpDown className="text-gray-500" />
            </span>

            <DropdownMenu modal={false}>
               <DropdownMenuTrigger
                  render={
                     <Button
                        variant="outline"
                        className="justify-between min-w-41"
                     >
                        {selectedOption}
                        <ChevronDown className="size-4 text-muted-foreground" />
                     </Button>
                  }
               />
               <DropdownMenuContent align="end">
                  {options.map((o) => (
                     <DropdownMenuItem
                        key={o.value}
                        onClick={() => {
                           onSort(o.value);
                           setSelectedOption(o.label);
                        }}
                     >
                        {o.label}
                        {o.value === sort && (
                           <Check className="ml-auto size-4" />
                        )}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
            </DropdownMenu>
            {/*
            <select
               value={sort}
               onChange={(e) => onSort(e.target.value)}
               className="rounded-md border bg-background px-3 py-2 text-sm"
            >
               {options.map((o) => (
                  <option key={o.value} value={o.value}>
                     {o.label}
                  </option>
               ))}
            </select> */}
         </div>
      </div>
   );
}

export default ListControls;
