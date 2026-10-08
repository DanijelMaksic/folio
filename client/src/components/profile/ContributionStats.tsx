import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { isContributor } from '@shared';

interface StatProps {
   label: string;
   value: number;
   hint?: string;
}

function Stat({ label, value, hint }: StatProps) {
   return (
      <div className="rounded-lg border p-4">
         <p className="text-3xl font-semibold tabular-nums">{value}</p>
         <p className="mt-1 text-sm text-muted-foreground">{label}</p>
         {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
         )}
      </div>
   );
}

function ContributionStats() {
   const { data, isLoading, isError } = trpc.profile.getStats.useQuery();
   const { data: session, isPending } = useSession();
   const user = session?.user;
   const canContribute = isContributor(user?.globalRole);

   if (isLoading) {
      return (
         <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
               <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg border bg-muted/50"
               />
            ))}
         </div>
      );
   }

   if (isError || !data) {
      return (
         <p className="text-sm text-destructive">
            Could not load your contribution stats.
         </p>
      );
   }

   if (!canContribute)
      return (
         <p className="text-muted-foreground">
            Become a contributor to see your contribution stats
         </p>
      );

   // Approval rate is only meaningful once something has been reviewed
   const reviewed = data.approved + data.rejected;
   const approvalRate =
      reviewed > 0 ? `${Math.round((data.approved / reviewed) * 100)}%` : '—';

   return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
         <Stat label="Documents uploaded" value={data.documentsUploaded} />
         <Stat label="Transcriptions" value={data.totalTranscriptions} />
         <Stat
            label="Approved"
            value={data.approved}
            hint={`Approval rate: ${approvalRate}`}
         />
         <Stat label="Awaiting review" value={data.submitted} />
         <Stat label="Rejected" value={data.rejected} />
         <Stat label="Drafts" value={data.drafts} />
      </div>
   );
}

export default ContributionStats;
