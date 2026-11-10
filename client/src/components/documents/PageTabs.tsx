import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';
import { ReactElement } from 'react';
import GuidelinesTab from '@/components/documents/GuidelinesTab';
import { Transcription } from '@shared';

function PageTabs({
   children,
   tab,
   onTabChange,
   transcription,
}: {
   children: ReactElement;
   tab: string;
   onTabChange: (tab: string) => void;
   transcription?: Transcription;
}) {
   return (
      <Tabs value={tab} onValueChange={(value) => onTabChange(String(value))}>
         <div className="flex justify-between items-center gap-3 mt-1 mb-2">
            <TabsList>
               <TabsTrigger value="overview">Overview</TabsTrigger>
               <TabsTrigger value="versions" data-testid="versions-tab-btn">
                  Versions
               </TabsTrigger>

               <TabsTrigger
                  value="transcribe"
                  data-testid="transcribe-tab-btn"
                  className={`relative ${transcription?.status === 'rejected' ? 'text-destructive' : ''}`}
               >
                  Transcribe
                  {transcription?.status === 'rejected' && (
                     <span
                        role="img"
                        aria-label="Transcription rejected"
                        className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-white z-10"
                     >
                        !
                     </span>
                  )}
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
         <TabsContent value="versions"></TabsContent>
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
