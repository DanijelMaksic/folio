import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';

function DocumentTabs({ canTranscribe }: { canTranscribe: boolean }) {
   const hiddenStyle = `${!canTranscribe && 'hidden'}`;

   return (
      <Tabs defaultValue="overview">
         <TabsList className={hiddenStyle}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcribe">Transcribe</TabsTrigger>
            <TabsTrigger value="revision-history">Revision History</TabsTrigger>
         </TabsList>
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

export default DocumentTabs;
