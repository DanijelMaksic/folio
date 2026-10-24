import { DocumentTabsProps } from '@/components/documents/DocumentTabs';
import PageCard from '@/components/documents/PageCard';
import AppPagination from '@/components/shared/AppPagination';
import { useSearchParams } from 'react-router-dom';

function PagesTab({
   isReady,
   pages,
   isLoadingPages,
   search,
   status,
   documentId,
   totalPages,
}: DocumentTabsProps) {
   const [searchParams, setSearchParams] = useSearchParams();

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

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
                     currentPage={page}
                     totalPages={totalPages}
                     onPageChange={handlePageChange}
                  />
               )}
            </>
         )}
      </>
   );
}

export default PagesTab;
