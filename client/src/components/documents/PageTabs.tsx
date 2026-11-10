import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';
import { ReactElement } from 'react';
import GuidelinesTab from '@/components/documents/GuidelinesTab';

function PageTabs({
   children,
   tab,
   onTabChange,
}: {
   children: ReactElement;
   tab: string;
   onTabChange: (tab: string) => void;
}) {
   return (
      <Tabs
         defaultValue="overview"
         value={tab}
         onValueChange={(value) => onTabChange(String(value))}
      >
         <div className="flex justify-between items-center gap-3 mt-1 mb-2">
            <TabsList>
               <TabsTrigger value="overview">Overview</TabsTrigger>
               <TabsTrigger value="transcribe" data-testid="transcribe-tab-btn">
                  Transcribe
               </TabsTrigger>
               <TabsTrigger
                  value="revision-history"
                  data-testid="revision-tab-btn"
               >
                  My Revisions
               </TabsTrigger>
               <TabsTrigger value="guidelines" data-testid="guidelines-tab-btn">
                  Guidelines
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
         <TabsContent value="guidelines">
            <GuidelinesTab />
         </TabsContent>
      </Tabs>
   );
}

export default PageTabs;
