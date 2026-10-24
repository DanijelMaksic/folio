import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AboutTab from '@/components/documents/AboutTab';
import StatisticsTab from '@/components/documents/StatisticsTab';
import CollectionDocumentsTab from '@/components/collections/CollectionDocumentsTab';

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
   description?: string | null;
   page: number;
   totalPages: number;
   onPageChange: (page: number) => void;
}

function CollectionTabs({
   isLoadingDocs,
   displayedDocuments,
   isSearchActive,
   description,
   page,
   totalPages,
   onPageChange,
}: CollectionTabsProps) {
   return (
      <Tabs defaultValue="documents">
         <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
         </TabsList>

         <TabsContent value="documents">
            <CollectionDocumentsTab
               isLoadingDocs={isLoadingDocs}
               displayedDocuments={displayedDocuments}
               isSearchActive={isSearchActive}
               page={page}
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

export default CollectionTabs;
