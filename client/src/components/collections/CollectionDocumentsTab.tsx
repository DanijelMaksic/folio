import { CollectionTabsProps } from '@/components/collections/CollectionTabs';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { Link } from 'react-router-dom';

function CollectionDocumentsTab({
   isLoadingDocs,
   displayedDocuments,
   isSearchActive,
}: CollectionTabsProps) {
   return (
      <>
         {isLoadingDocs ? (
            <p className="text-muted-foreground">Loading documents...</p>
         ) : !displayedDocuments?.length ? (
            <p className="text-muted-foreground">
               {isSearchActive ? (
                  'No documents found.'
               ) : (
                  <>
                     Your collection is empty.{' '}
                     <Link
                        to="/documents"
                        className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                     >
                        Go to documents
                     </Link>{' '}
                     to add some.
                  </>
               )}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {displayedDocuments.map((document) => (
                  <DocumentCard document={document} key={document.id} />
               ))}
            </div>
         )}
      </>
   );
}

export default CollectionDocumentsTab;
