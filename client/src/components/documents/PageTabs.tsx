import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';
import { ReactElement } from 'react';

function PageTabs({
   canTranscribe,
   children,
}: {
   canTranscribe: boolean;
   children: ReactElement;
}) {
   const hiddenStyle = `${!canTranscribe && 'hidden'}`;

   return (
      <Tabs defaultValue="overview">
         <div className="flex justify-between items-center gap-3 mt-1 mb-2">
            <TabsList>
               <TabsTrigger value="overview">Overview</TabsTrigger>
               <TabsTrigger
                  value="transcribe"
                  data-testid="transcribe-tab-btn"
                  className={hiddenStyle}
               >
                  Transcribe
               </TabsTrigger>
               <TabsTrigger
                  value="revision-history"
                  data-testid="revision-tab-btn"
                  className={hiddenStyle}
               >
                  Revision History
               </TabsTrigger>
            </TabsList>

            {children}
         </div>

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
