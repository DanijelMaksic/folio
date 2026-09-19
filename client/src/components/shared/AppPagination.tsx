import {
   Pagination,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
} from '@/components/ui/pagination';

interface AppPaginationProps {
   currentPage: number;
   totalPages: number;
   onPageChange: (page: number) => void;
}

function AppPagination({
   currentPage,
   totalPages,
   onPageChange,
}: AppPaginationProps) {
   const pages = getPageNumbers(currentPage, totalPages);

   return (
      <Pagination className="mt-8">
         <PaginationContent>
            <PaginationItem>
               <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                     e.preventDefault();
                     if (currentPage > 1) onPageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={
                     currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                  }
               />
            </PaginationItem>

            {pages.map((p, i) =>
               p === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                     <PaginationEllipsis />
                  </PaginationItem>
               ) : (
                  <PaginationItem key={p}>
                     <PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(e) => {
                           e.preventDefault();
                           onPageChange(p);
                        }}
                     >
                        {p}
                     </PaginationLink>
                  </PaginationItem>
               ),
            )}

            <PaginationItem>
               <PaginationNext
                  href="#"
                  onClick={(e) => {
                     e.preventDefault();
                     if (currentPage < totalPages)
                        onPageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={
                     currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                  }
               />
            </PaginationItem>
         </PaginationContent>
      </Pagination>
   );
}

// Produces e.g. [1, 2, 3, 'ellipsis', 10] or [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
function getPageNumbers(
   current: number,
   total: number,
): (number | 'ellipsis')[] {
   if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

   if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', total];
   if (current >= total - 3)
      return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
   return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export default AppPagination;
