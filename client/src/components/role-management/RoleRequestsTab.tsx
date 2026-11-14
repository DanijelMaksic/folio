import RejectRoleRequestModal from '@/components/role-management/RejectRoleRequestModal';
import { trpc } from '@/lib/trpc';
import { AppRouter } from '@server/trpc/router';
import { TRPCClientErrorLike } from '@trpc/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
   dateStyle: 'medium',
   timeStyle: 'short',
});

function RoleRequestsTab() {
   const [approvingId, setApprovingId] = useState<string | null>(null);
   const [listError, setListError] = useState('');
   const [rejectingId, setRejectingId] = useState<string | null>(null);
   const [rejectError, setRejectError] = useState('');

   const utils = trpc.useUtils();

   const { data, isLoading, isError } = trpc.admin.listRoleRequests.useQuery();

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
