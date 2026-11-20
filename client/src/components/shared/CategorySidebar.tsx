import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type Props = {
   value: string; // slug, '' = all
   onChange: (slug: string) => void;
};

const TAG_STYLES = {
   on: 'bg-primary text-primary-foreground border-primary',
   off: 'bg-background hover:bg-muted border-border',
};

export default function CategorySidebar({ value, onChange }: Props) {
   const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
      staleTime: 60_000,
   });

   return (
      <aside className="lg:sticky lg:top-24 lg:self-start">
         <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-medium text-xl">Categories</h3>
         </div>

         <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
               <button
                  key={c.id}
                  type="button"
                  aria-pressed={value === c.slug}
                  onClick={() => onChange(value === c.slug ? '' : c.slug)}
                  className={cn(
                     'rounded-full border px-3 py-1 text-sm',
                     value === c.slug ? TAG_STYLES.on : TAG_STYLES.off,
                  )}
               >
                  {c.name}
               </button>
            ))}
         </div>
      </aside>
   );
}
