import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';
import { trpc } from '@/lib/trpc';
import { ReactElement } from 'react';

function PageTabs({
   canTranscribe,
   pageId,
   children,
}: {
   canTranscribe: boolean;
   pageId: string;
   children: ReactElement;
}) {
   const { data: approvedTranscription } =
      trpc.transcriptions.getApprovedByPage.useQuery({
         pageId,
      });

   const hiddenStyle = `${!canTranscribe && 'hidden'}`;

   return (
      <Tabs defaultValue="overview">
         {!approvedTranscription && (
            <div className="flex justify-between items-center gap-3 mt-1 mb-2">
               <TabsList className={hiddenStyle}>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger
                     value="transcribe"
                     data-testid="transcribe-tab-btn"
                  >
                     Transcribe
                  </TabsTrigger>
                  <TabsTrigger
                     value="revision-history"
                     data-testid="revision-tab-btn"
                  >
                     Revision History
                  </TabsTrigger>
               </TabsList>
               {children}
            </div>
         )}

         <TabsContent value="overview">
            <OverviewTab />
         </TabsContent>
         <TabsContent value="transcribe">
            <TranscribeTab />
         </TabsContent>
         <TabsContent value="revision-history">
            <RevisionHistoryTab />
         </TabsContent>
      </Tabs>
   );
}

export default PageTabs;
