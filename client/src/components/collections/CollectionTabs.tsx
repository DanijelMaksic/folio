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
}

function CollectionTabs({
   isLoadingDocs,
   displayedDocuments,
   isSearchActive,
   description,
}: CollectionTabsProps) {
   return (
      <Tabs defaultValue="pages">
         <TabsList>
            <TabsTrigger value="documents" data-testid="documents-tab-btn">
               Documents
            </TabsTrigger>
            <TabsTrigger value="about" data-testid="about-tab-btn">
               About
            </TabsTrigger>
            <TabsTrigger value="statistics" data-testid="statistics-tab-btn">
               Statistics
            </TabsTrigger>
         </TabsList>

         <TabsContent value="documents">
            <CollectionDocumentsTab
               isLoadingDocs={isLoadingDocs}
               displayedDocuments={displayedDocuments}
               isSearchActive={isSearchActive}
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
