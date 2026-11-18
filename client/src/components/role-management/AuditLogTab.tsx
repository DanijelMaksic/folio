import { timeAgo } from '@/lib/helpers';
import { trpc } from '@/lib/trpc';
import { useSearchParams } from 'react-router-dom';

type RoleChangesSort = 'newest' | 'oldest';

const SORTS: RoleChangesSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<RoleChangesSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

function AuditLogTab() {
   const [searchParams, setSearchParams] = useSearchParams();

   const { data: roleChanges, isLoading } =
      trpc.admin.listRoleChanges.useQuery();

   if (isLoading) {
      return (
         <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
               <div
                  key={i}
                  className="h-40 animate-pulse rounded-lg border bg-muted/50"
               />
            ))}
         </div>
      );
   }

   if (!roleChanges) {
      return (
         <p className="text-sm text-destructive">
            Could not load role changes.
         </p>
      );
   }

   return (
      <>
         <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-medium">Role changes</h3>

            <p className="text-[1rem]">Sort by: Newest</p>
         </div>

         <ul className="mt-4">
            {roleChanges.map((c) => (
               <li
                  key={c.id}
                  className="border-t py-3 last:border-b flex items-center gap-3 justify-between"
               >
                  <div className="flex items-center gap-1.5">
                     <span className="font-medium underline">
                        {c.actorUsername ?? 'Delete user'}
                     </span>
                     {(c.oldRole === 'contributor' && c.newRole === 'editor') ||
                     (c.oldRole === 'editor' && c.newRole === 'admin') ? (
                        <span>promoted</span>
                     ) : (
                        <span>demoted</span>
                     )}
                     <span className="font-medium underline">
                        {c.targetUsername ?? 'Delete user'}
                     </span>
                     <span>from</span>
                     <span className="border border-gray-300 rounded-full px-2.5">
                        {c.oldRole}
                     </span>
                     <span>to </span>
                     <span className="border border-gray-300 rounded-full px-2.5">
                        {c.newRole}
                     </span>

                     {c.source === 'request' && (
                        <span className="text-sm text-muted-foreground">
                           (via request)
                        </span>
                     )}
                  </div>

                  <div className="flex items-center gap-3">
                     <span>{timeAgo(c.createdAt)}</span>
                  </div>
               </li>
            ))}
         </ul>
      </>
   );
}

export default AuditLogTab;
