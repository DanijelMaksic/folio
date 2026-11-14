import RejectRoleRequestModal from '@/components/role-management/RejectRoleRequestModal';
import { trpc } from '@/lib/trpc';
import { AppRouter } from '@server/trpc/router';
import { TRPCClientErrorLike } from '@trpc/client';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
   dateStyle: 'medium',
   timeStyle: 'short',
});

type RequestSort = 'newest' | 'oldest';

const SORTS: RequestSort[] = ['newest', 'oldest'];

const SORT_LABELS: Record<RequestSort, string> = {
   newest: 'Newest',
   oldest: 'Oldest',
};

function RoleRequestsTab() {
   const [approvingId, setApprovingId] = useState<string | null>(null);
   const [listError, setListError] = useState('');
   const [rejectingId, setRejectingId] = useState<string | null>(null);
   const [rejectError, setRejectError] = useState('');
   const [searchParams, setSearchParams] = useSearchParams();

   const utils = trpc.useUtils();

   const rawSort = searchParams.get('sort') as RequestSort | null;
   const sort: RequestSort =
      rawSort && SORTS.includes(rawSort) ? rawSort : 'newest';

   const { data, isLoading, isError } = trpc.admin.listRoleRequests.useQuery({
      sort,
   });

   const approve = trpc.admin.approveRoleRequest.useMutation({
      onSuccess: () => utils.admin.listRoleRequests.invalidate(),
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setListError(err.message);
         // e.g. already reviewed by another admin: refresh the list
         utils.admin.listRoleRequests.invalidate();
      },
      onSettled: () => setApprovingId(null),
   });

   const reject = trpc.admin.rejectRoleRequest.useMutation({
      onSuccess: () => {
         utils.admin.listRoleRequests.invalidate();
         setRejectingId(null);
      },
      onError: (err: TRPCClientErrorLike<AppRouter>) => {
         setRejectError(err.message);
      },
   });

   const handleSetSort = (newSort: RequestSort) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newSort === 'newest') next.delete('sort');
         else next.set('sort', newSort);
         next.set('page', '1');
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

   if (isError || !data) {
      return (
         <p className="text-sm text-destructive">
            Could not load role requests.
         </p>
      );
   }

   const rejecting = data.find((r) => r.id === rejectingId);

   return (
      <>
         {listError && (
            <p role="alert" className="text-sm text-destructive">
               {listError}
            </p>
         )}

         <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
               <h3 className="text-xl font-medium">Pending requests</h3>
               <span className="text-gray-600 text-lg bg-gray-100 px-2.5 rounded-md">
                  {data.length}
               </span>
            </div>

            {data && (
               <div
                  className={`flex items-center gap-2 border rounded-md ${data?.length! < 2 ? 'opacity-50 pointer-events-none' : ''}`}
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
            )}
         </div>

         {data.length === 0 ? (
            <div className="rounded-lg p-10 text-center">
               <p className="font-medium">No pending requests</p>
               <p className="mt-1 text-sm text-muted-foreground">
                  New role requests will show up here.
               </p>
            </div>
         ) : (
            <ul className="space-y-4">
               {data.map((request) => {
                  const busy = approvingId === request.id;

                  return (
                     <li
                        key={request.id}
                        data-testid="role-request"
                        className="space-y-4 rounded-lg border p-4"
                     >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                           <div className="min-w-0">
                              <p className="font-semibold text-lg">
                                 <Link
                                    className="hover:underline"
                                    to={`/users/${request.username}`}
                                 >
                                    {request.name}
                                 </Link>
                              </p>
                              <p className="break-all text-sm text-muted-foreground">
                                 @{request.username} • {request.email}
                              </p>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              {dateFormatter.format(
                                 new Date(request.createdAt),
                              )}
                           </p>
                        </div>

                        <p className="text-sm">
                           <span className="capitalize">
                              {request.currentRole}
                           </span>
                           {' → '}
                           <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
                              {request.requestedRole}
                           </span>
                        </p>

                        <blockquote className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm">
                           {request.message}
                        </blockquote>

                        <div className="flex justify-end gap-2">
                           <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() => {
                                 setRejectError('');
                                 setRejectingId(request.id);
                              }}
                           >
                              Reject
                           </Button>
                           <Button
                              disabled={busy}
                              onClick={() => {
                                 setListError('');
                                 setApprovingId(request.id);
                                 approve.mutate({ id: request.id });
                              }}
                           >
                              {busy ? 'Approving...' : 'Approve'}
                           </Button>
                        </div>
                     </li>
                  );
               })}
            </ul>
         )}

         <RejectRoleRequestModal
            open={!!rejecting}
            applicant={
               rejecting
                  ? rejecting.name || rejecting.username || rejecting.email
                  : ''
            }
            isPending={reject.isPending}
            error={rejectError}
            onConfirm={(reason) =>
               reject.mutate({ id: rejectingId!, reason: reason || undefined })
            }
            onClose={() => {
               setRejectingId(null);
               setRejectError('');
            }}
         />
      </>
   );
}

export default RoleRequestsTab;
