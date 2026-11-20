import { useSession } from '@/lib/auth-client';
import { isEditor } from '@shared';
import { Link } from 'react-router-dom';

type Props = {
   reviewQueueCount: number | null;
   pendingRoleRequestCount: number | null;
};

export function AttentionCards({
   reviewQueueCount,
   pendingRoleRequestCount,
}: Props) {
   const { data: session } = useSession();

   const cards = [
      reviewQueueCount !== null && {
         key: 'review',
         to: '/review',
         count: reviewQueueCount,
         label: 'transcriptions awaiting review',
      },
      pendingRoleRequestCount !== null && {
         key: 'roles',
         to: '/role-management',
         count: pendingRoleRequestCount,
         label: 'pending role requests',
      },
      isEditor(session?.user?.globalRole) && {
         key: 'categories',
         to: '/category-management',
         catLabel: 'Manage categories',
      },
   ].filter(Boolean) as {
      key: string;
      to: string;
      count: number;
      label: string;
      catLabel?: string;
   }[];

   if (cards.length === 0) return null;

   return (
      <div className="grid gap-3 sm:grid-cols-2">
         {cards.map((c) => (
            <Link
               key={c.key}
               to={c.to}
               data-testid={`attention-${c.key}`}
               className={`flex items-center ${c.catLabel ? 'gap-0' : 'gap-4'} rounded-lg border p-4 transition-colors hover:bg-muted`}
            >
               <span className="text-3xl font-semibold">{c.count}</span>
               <span className="text-sm text-muted-foreground">{c.label}</span>
               <span className="text-lg">{c.catLabel}</span>
            </Link>
         ))}
      </div>
   );
}
