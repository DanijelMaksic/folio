import { trpc } from '@/lib/trpc';

type Props = {
   id: string;
   value: string; // '' = none
   onChange: (id: string) => void;
};

export default function CategorySelect({ id, value, onChange }: Props) {
   const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
      staleTime: 60_000,
   });

   return (
      <select
         id={id}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
         <option value="">No category</option>
         {categories.map((c) => (
            <option key={c.id} value={c.id}>
               {c.name}
            </option>
         ))}
      </select>
   );
}
