import StatsView from '@/components/shared/StatsView';
import { trpc } from '@/lib/trpc';

function StatisticsTab({ documentId }: { documentId: string }) {
   const {
      data: stats,
      isPending,
      error,
   } = trpc.documents.getStats.useQuery(
      { id: documentId },
      { enabled: !!documentId },
   );

   if (isPending) return <p className="text-muted-foreground">Loading...</p>;
   if (error || !stats)
      return <p className="text-destructive">Could not load statistics.</p>;

   return (
      <StatsView
         percent={stats.percent}
         items={[
            { label: 'Total pages', value: stats.totalPages },
            { label: 'Transcribed', value: stats.transcribedPages },
            { label: 'Awaiting review', value: stats.submittedPages },
            { label: 'Not started', value: stats.notStartedPages },
            { label: 'Contributors', value: stats.contributors },
         ]}
      />
   );
}

export default StatisticsTab;
