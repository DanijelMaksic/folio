import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DisplayTab from '@/components/documents/DisplayTab';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';

function DocumentTabs() {
   return (
      <Tabs defaultValue="overview">
         <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcribe">Transcribe</TabsTrigger>
            <TabsTrigger value="revision-history">Revision History</TabsTrigger>
         </TabsList>
         <TabsContent value="overview">
            <DisplayTab />
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
