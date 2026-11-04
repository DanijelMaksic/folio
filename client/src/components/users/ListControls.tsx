import { ArrowUpDown } from 'lucide-react';
import SearchBar from '@/components/shared/SearchBar';

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
            </select>
         </div>
      </div>
   );
}

export default ListControls;
