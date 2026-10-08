import type { ContributionStats } from '@folio/shared';

type Props = { stats: ContributionStats | null; isLoading: boolean };

export function OverviewStats({ stats, isLoading }: Props) {
   if (isLoading || !stats) {
      return (
         <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
               <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg border bg-muted"
               />
            ))}
         </div>
      );
   }

   const decided = stats.approved + stats.rejected;
   const rate =
      decided > 0 ? Math.round((stats.approved / decided) * 100) : null;

   const items = [
      { label: 'Documents', value: stats.documentsUploaded },
      { label: 'Drafts', value: stats.drafts },
      { label: 'Awaiting review', value: stats.submitted },
      {
         label: 'Approved',
         value: stats.approved,
         hint: rate !== null ? `${rate}% approval rate` : undefined,
      },
   ];

   return (
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
         {items.map((item) => (
            <div key={item.label} className="rounded-lg border p-4">
               <dt className="text-xs text-muted-foreground">{item.label}</dt>
               <dd className="text-2xl font-semibold">{item.value}</dd>
               {item.hint && (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
               )}
            </div>
         ))}
      </dl>
   );
}
