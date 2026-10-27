import PageCard from '@/components/documents/PageCard';
import AppPagination from '@/components/shared/AppPagination';
import { StatusType } from '@/pages/DocumentPages';

interface Page {
   id: string;
   createdAt: string;
   title: string;
   pageNumber: number;
   imageUrl: string;
   approvedTranscriptionCount: number;
}

interface PagesTabProps {
   isReady: boolean;
   pages: Page[];
   isLoadingPages: boolean;
   search: string;
   status: StatusType;
   documentId: string | undefined;
   currentPage: number;
   totalPages: number;
   onPageChange: (newNumber: number) => void;
}

function PagesTab({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   documentId,
   totalPages,
   currentPage,
   onPageChange,
}: PagesTabProps) {
   return (
      <>
         {isReady && (
            <>
               {isLoadingPages ? (
                  <p>Loading pages...</p>
               ) : !pages.length ? (
                  <p className="text-muted-foreground">
                     {search && status !== 'all-pages'
                        ? 'No pages match your search and filter.'
                        : search
                          ? `No results found for your search.`
                          : status !== 'all-pages'
                            ? 'No pages match this filter.'
                            : 'This document is empty. Add a page to get started.'}
                  </p>
               ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {pages.map((page) => (
                        <PageCard
                           page={page}
                           documentId={documentId!}
                           key={page.id}
                        />
                     ))}
                  </div>
               )}

               {!!pages.length && (
                  <AppPagination
                     currentPage={currentPage}
                     totalPages={totalPages}
                     onPageChange={onPageChange}
                  />
               )}
            </>
         )}
      </>
   );
}

export default PagesTab;
