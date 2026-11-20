import { timeAgo } from '@/lib/helpers';
import { trpc } from '@/lib/trpc';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import AppPagination from '@/components/shared/AppPagination';
import RoleChangeTypeFilter from '@/components/role-management/RoleChangeTypeFilter';

type RoleChangesSort = 'newest' | 'oldest';

const SORTS: RoleChangesSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<RoleChangesSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

export type RoleChangeType = 'all' | 'promotion' | 'demotion';

const VALID_ROLES: RoleChangeType[] = ['all', 'promotion', 'demotion'];

function AuditLogTab() {
   const [searchParams, setSearchParams] = useSearchParams();
   const PAGE_SIZE = 9;

   const rawSort = searchParams.get('sort') as RoleChangesSort | null;
   const sort: RoleChangesSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);

   const rawType = searchParams.get('role') as RoleChangeType | null;
   const type: RoleChangeType =
      rawType && VALID_ROLES.includes(rawType) ? rawType : 'all';

   const { data, isLoading } = trpc.admin.listRoleChanges.useQuery(
      {
         limit: 20,
         sort,
         page,
         type,
      },
      { placeholderData: (prev) => prev },
   );

   const handleSetSort = (newSort: RoleChangesSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
         return next;
      });
   };

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   const handleSetType = (newType: RoleChangeType) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newType === 'all') {
            next.delete('role');
         } else {
            next.set('role', newType);
         }
         return next;
      });
   };

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

   if (!data?.roleChanges) {
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

            <div className="flex items-center gap-3">
               <RoleChangeTypeFilter onSetType={handleSetType} type={type} />

               <div
                  className={`flex items-center gap-2 border rounded-md ${!data.roleChanges ? 'opacity-50 pointer-events-none' : ''}`}
               >
                  <span className="pl-3">
                     <ArrowUpDown className="text-gray-500" />
                  </span>

                  <DropdownMenu modal={false}>
                     <DropdownMenuTrigger
                        render={
                           <Button
                              variant="outline"
                              className="justify-between min-w-26"
                           >
                              {SORT_LABELS[sort]}
                              <ChevronDown className="size-4 text-muted-foreground" />
                           </Button>
                        }
                     />
                     <DropdownMenuContent align="end">
                        {SORTS.map((s) => (
                           <DropdownMenuItem
                              key={s}
                              onClick={() => handleSetSort(s)}
                           >
                              {SORT_LABELS[s]}
                              {s === sort && (
                                 <Check className="ml-auto size-4" />
                              )}
                           </DropdownMenuItem>
                        ))}
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
         </div>

         <ul className="mt-4">
            {data.roleChanges.map((c) => (
               <li
                  key={c.id}
                  className="border-t py-3 last:border-b flex items-center gap-3 justify-between"
               >
                  <div className="flex items-center gap-1.5">
                     <Link
                        to={`/users/${c.actorUsername}`}
                        className="font-medium underline hover:text-gray-700"
                     >
                        {c.actorUsername ?? 'Deleted user'}
                     </Link>
                     {(c.oldRole === 'contributor' && c.newRole === 'editor') ||
                     (c.oldRole === 'editor' && c.newRole === 'admin') ? (
                        <span>promoted</span>
                     ) : (
                        <span>demoted</span>
                     )}
                     <Link
                        to={`/users/${c.targetUsername}`}
                        className="font-medium underline hover:text-gray-700"
                     >
                        {c.targetUsername ?? 'Deleted user'}
                     </Link>
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

         {!!data.roleChanges?.length && (
            <AppPagination
               currentPage={page}
               totalPages={data.totalPages ?? 1}
               onPageChange={handlePageChange}
            />
         )}
      </>
   );
}

export default AuditLogTab;
