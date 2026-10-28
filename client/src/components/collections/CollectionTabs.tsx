import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AboutTab from '@/components/collections/AboutTab';
import StatisticsTab from '@/components/documents/StatisticsTab';
import CollectionDocumentsTab from '@/components/collections/CollectionDocumentsTab';
import { ReactElement } from 'react';
import { Collection } from '@shared';

interface DisplayedDocument {
   id: string;
   createdAt: string;
   updatedAt: string;
   title: string;
   description: string | null;
   uploadedBy: string;
   status: 'processing' | 'ready' | 'failed';
   collectionId: string | null;
   uploaderName: string | null;
   coverImageUrl: string | null;
   pageCount: number;
}

export interface CollectionTabsProps {
   isLoadingDocs: boolean;
   displayedDocuments: DisplayedDocument[] | undefined;
   isSearchActive: boolean;
   page: number;
   collection: Collection;
   totalPages: number;
   onPageChange: (page: number) => void;
   children: ReactElement;
}

function CollectionTabs({
   isLoadingDocs,
   displayedDocuments,
   isSearchActive,
   collection,
   page,
   totalPages,
   onPageChange,
   children,
}: CollectionTabsProps) {
   return (
      <Tabs defaultValue="documents">
         <div className="flex justify-between items-center gap-3">
            <TabsList>
               <TabsTrigger value="documents">Documents</TabsTrigger>
               <TabsTrigger value="about">About</TabsTrigger>
               <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            {children}
         </div>

         <TabsContent value="documents">
            <CollectionDocumentsTab
               isLoadingDocs={isLoadingDocs}
               displayedDocuments={displayedDocuments}
               isSearchActive={isSearchActive}
               page={page}
               totalPages={totalPages}
               onPageChange={onPageChange}
               children={children}
               collection={collection}
            />
         </TabsContent>
         <TabsContent value="about">
            <AboutTab collection={collection} />
         </TabsContent>
         <TabsContent value="statistics">
            <StatisticsTab />
         </TabsContent>
      </Tabs>
   );
}

export default CollectionTabs;
