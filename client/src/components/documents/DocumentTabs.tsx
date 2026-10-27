import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StatusType } from '@/pages/DocumentPages';
import PagesTab from '@/components/documents/PagesTab';
import AboutTab from '@/components/documents/AboutTab';
import StatisticsTab from '@/components/documents/StatisticsTab';
import { ReactElement } from 'react';
import { Document } from '@shared';

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
   document: Document;
   onPageChange: (newNumber: number) => void;
   children: ReactElement;
}

function DocumentTabs({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   documentId,
   currentPage,
   document,
   totalPages,
   onPageChange,
   children,
}: DocumentTabsProps) {
   return (
      <div className="">
         <Tabs defaultValue="pages">
            <div className="flex justify-between items-center gap-3 mt-1 mb-2">
               <TabsList>
                  <TabsTrigger value="pages">Pages</TabsTrigger>
                  <TabsTrigger value="about" data-testid="pages-tab-btn">
                     About
                  </TabsTrigger>
                  <TabsTrigger
                     value="statistics"
                     data-testid="statistics-tab-btn"
                  >
                     Statistics
                  </TabsTrigger>
               </TabsList>

               {children}
            </div>

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
               {document && <AboutTab document={document} />}
            </TabsContent>
            <TabsContent value="statistics">
               <StatisticsTab />
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default DocumentTabs;
