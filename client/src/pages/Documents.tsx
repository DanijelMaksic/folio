import { trpc } from '@/lib/trpc';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Document, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { DocumentCard } from '@/components/documents/DocumentCard.js';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';
import TranscriptionFilter from '@/components/documents/TranscriptionFilter';
import AppPagination from '@/components/shared/AppPagination';

export type StatusType = 'all documents' | 'transcribed' | 'not-transcribed';

const VALID_STATUSES: StatusType[] = [
   'all documents',
   'transcribed',
   'not-transcribed',
];

export default function Documents() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const rawStatus = searchParams.get('status') as StatusType | null;
   const status: StatusType =
      rawStatus && VALID_STATUSES.includes(rawStatus)
         ? rawStatus
         : 'all documents';

   const rawPage = Number(searchParams.get('page')) || 1;
   const page = rawPage > 0 ? rawPage : 1;

   const handlePageChange = (newPage: number) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(newPage));
         return next;
      });
   };

   const handleSetStatus = (newStatus: StatusType) => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         if (newStatus === 'all documents') {
            next.delete('status');
         } else {
            next.set('status', newStatus);
         }
         return next;
      });
   };

   // Reset to page 1 when filter or search changes
   useEffect(() => {
      setSearchParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', '1');
         return next;
      });
   }, [status, debouncedSearch]);

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 500);
      return () => clearTimeout(t);
   }, [search]);

   const { data, isLoading } = trpc.documents.list.useQuery({
      page,
      limit: 20,
      status,
      // search: debouncedSearch,
   });

   const { data: searchResults } = trpc.documents.search.useQuery(
      {
         query: debouncedSearch,
      },
      {
         enabled: debouncedSearch.length > 0,
         placeholderData: (prev: Document) => prev,
         staleTime: 1000,
      },
   );

   // data is now { documents, totalCount, totalPages }
   const documents = data?.documents;
   const totalPages = data?.totalPages ?? 1;

   const isSearchActive = debouncedSearch.length > 0;
   const displayedDocuments = isSearchActive ? searchResults : documents;

   const filteredDocuments = displayedDocuments?.filter((doc: Document) => {
      if (status === 'transcribed') return doc.hasApprovedTranscription;
      if (status === 'not-transcribed') return !doc.hasApprovedTranscription;
      return true; // all
   });

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="grid grid-cols-[2fr_3fr_1fr_0.1fr] gap-5 mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>

            <SearchBar
               placeholder="Search documents..."
               value={search}
               onChange={setSearch}
            />

            <TranscriptionFilter
               onSetStatus={handleSetStatus}
               status={status}
            />

            {canTranscribe ? (
               <Button onClick={() => navigate('/documents/upload')}>
                  <Plus />
               </Button>
            ) : (
               <>
                  <span></span>
                  <span></span>
               </>
            )}
         </div>

         {!filteredDocuments?.length ? (
            <p className="text-muted-foreground">
               {isSearchActive
                  ? 'No results found for your search.'
                  : 'No documents found.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {filteredDocuments.map((doc: Document) => (
                  <DocumentCard doc={doc} key={doc.id} />
               ))}
            </div>
         )}

         <AppPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
         />
      </div>
   );
}
