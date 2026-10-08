import { Link, Navigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { useSession } from '@/lib/auth-client';
import { isContributor } from '@folio/shared';
import { Button } from '@/components/ui/button';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { AttentionCards } from '@/components/dashboard/AttentionCards';
import { RejectedList } from '@/components/dashboard/RejectedList';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';

export default function Dashboard() {
   const { data: session, isPending } = useSession();
   const user = session?.user;
   const canContribute = isContributor(user?.globalRole);

   const overview = trpc.dashboard.getOverview.useQuery(undefined, {
      enabled: !!session?.user && canContribute,
   });

   if (isPending) return null;

   if (!session?.user) return <Navigate to="/login" replace />;

   const data = overview.data;

   if (!canContribute) {
      return (
         <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground">
               The dashboard is available to contributors. Request the
               contributor role to upload documents and track your
               transcriptions.
            </p>
            <Button>
               <Link to="/profile">Request contributor role</Link>
            </Button>
         </div>
      );
   }

   return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
         <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
               <h1 className="text-2xl font-semibold">
                  Welcome back, {user?.name || 'there'}
               </h1>
               <p className="text-sm text-muted-foreground">
                  Here's what's happening in your workspace.
               </p>
            </div>
            {canContribute && (
               <Button>
                  <Link to="/documents/upload">Upload document</Link>
               </Button>
            )}
         </header>

         {overview.isError && (
            <p role="alert" className="text-sm text-destructive">
               Couldn't load your dashboard. {overview.error.message}
            </p>
         )}

         {data && (
            <AttentionCards
               reviewQueueCount={data.reviewQueueCount}
               pendingRoleRequestCount={data.pendingRoleRequestCount}
            />
         )}

         {canContribute && (
            <section aria-labelledby="stats-heading" className="space-y-3">
               <h2 id="stats-heading" className="text-lg font-medium">
                  Your activity
               </h2>
               <OverviewStats
                  stats={data?.stats ?? null}
                  isLoading={overview.isLoading}
               />
            </section>
         )}

         {canContribute && data && data.rejectedTranscriptions.length > 0 && (
            <section aria-labelledby="rejected-heading" className="space-y-3">
               <h2 id="rejected-heading" className="text-lg font-medium">
                  Needs your attention
               </h2>
               <RejectedList items={data.rejectedTranscriptions} />
            </section>
         )}

         <section aria-labelledby="docs-heading" className="space-y-3">
            <div className="flex items-center justify-between">
               <h2 id="docs-heading" className="text-lg font-medium">
                  Your recent documents
               </h2>
               <Link
                  to="/documents"
                  className="text-sm text-muted-foreground hover:underline"
               >
                  View all
               </Link>
            </div>
            <RecentDocuments
               documents={data?.recentDocuments ?? []}
               isLoading={overview.isLoading}
               canContribute={canContribute}
            />
         </section>
      </div>
   );
}
