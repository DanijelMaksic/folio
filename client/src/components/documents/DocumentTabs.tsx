import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StatusType } from '@/pages/DocumentPages';
import PagesTab from '@/components/documents/PagesTab';
import AboutTab from '@/components/documents/AboutTab';
import StatisticsTab from '@/components/documents/StatisticsTab';

interface Page {
   id: string;
   createdAt: string;
   title: string;
   pageNumber: number;
   imageUrl: string;
   approvedTranscriptionCount: number;
}

export interface DocumentTabsProps {
   isReady: boolean;
   pages: Page[];
   isLoadingPages: boolean;
   search: string;
   status: StatusType;
   documentId: string | undefined;
   totalPages: number;
   description?: string | null;
}

function DocumentTabs({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   documentId,
   totalPages,
   description,
}: DocumentTabsProps) {
   return (
      <Tabs defaultValue="pages">
         <TabsList>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="about" data-testid="pages-tab-btn">
               About
            </TabsTrigger>
            <TabsTrigger value="statistics" data-testid="statistics-tab-btn">
               Statistics
            </TabsTrigger>
         </TabsList>

         <TabsContent value="pages">
            <PagesTab
               isReady={isReady}
               pages={pages}
               search={search}
               status={status}
               isLoadingPages={isLoadingPages}
               documentId={documentId}
               totalPages={totalPages}
            />
         </TabsContent>
         <TabsContent value="about">
            <AboutTab description={description} />
         </TabsContent>
         <TabsContent value="statistics">
            <StatisticsTab />
         </TabsContent>
      </Tabs>
   );
}

export default DocumentTabs;
