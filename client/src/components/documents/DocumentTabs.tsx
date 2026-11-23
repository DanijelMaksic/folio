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
   tab: string;
   document: Document;
   onPageChange: (newNumber: number) => void;
   children: ReactElement;
   onTabChange: (tab: string) => void;
}

function DocumentTabs({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   tab,
   documentId,
   currentPage,
   document,
   totalPages,
   onPageChange,
   onTabChange,
   children,
}: DocumentTabsProps) {
   return (
      <div className="">
         <Tabs
            defaultValue="pages"
            value={tab}
            onValueChange={(value) => onTabChange(String(value))}
         >
            <div className="flex justify-between items-center gap-3 mt-1 mb-2">
               <TabsList>
                  <TabsTrigger value="pages" data-testid="pages-tab-btn">
                     Pages
                  </TabsTrigger>
                  <TabsTrigger value="about" data-testid="about-tab-btn">
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
               <StatisticsTab documentId={document.id} />
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default DocumentTabs;
