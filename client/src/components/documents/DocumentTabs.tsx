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
   currentPage: number;
   totalPages: number;
   description?: string | null;
   onPageChange: (newNumber: number) => void;
}

function DocumentTabs({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   documentId,
   currentPage,
   description,
   totalPages,
   onPageChange,
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
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={onPageChange}
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
