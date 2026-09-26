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

export type StatusType = 'all-documents' | 'transcribed' | 'not-transcribed';

const VALID_STATUSES: StatusType[] = [
   'all-documents',
   'transcribed',
   'not-transcribed',
];

export default function Documents() {
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);

   const page = Math.max(Number(searchParams.get('page')) || 1, 1);
   const search = searchParams.get('search') ?? '';
   const [inputValue, setInputValue] = useState(search);

   const rawStatus = searchParams.get('status') as StatusType | null;
   const status: StatusType =
      rawStatus && VALID_STATUSES.includes(rawStatus)
         ? rawStatus
         : 'all-documents';

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
         if (newStatus === 'all-documents') {
            next.delete('status');
         } else {
            next.set('status', newStatus);
         }
         next.set('page', '1');
         return next;
      });
   };

   useEffect(() => {
      const t = setTimeout(() => {
         setSearchParams(
            (prev) => {
               const next = new URLSearchParams(prev);
               if (inputValue) {
                  next.set('search', inputValue);
               } else {
                  next.delete('search');
               }
               next.set('page', '1');
               return next;
            },
            { replace: true },
         );
      }, 300);
      return () => clearTimeout(t);
   }, [inputValue]);

   const { data, isLoading } = trpc.documents.list.useQuery(
      {
         page,
         limit: 20,
         status,
         search: search || undefined,
      },
      {
         placeholderData: (prev) => prev,
         staleTime: 1000,
      },
   );

   const documents = data?.documents ?? [];
   const totalPages = data?.totalPages ?? 1;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="grid grid-cols-[2fr_3fr_1fr_0.1fr] gap-5 mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>

            <SearchBar
               placeholder="Search documents..."
               value={inputValue}
               onChange={setInputValue}
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

         {isLoading ? (
            <p>Loading...</p>
         ) : !documents.length ? (
            <p className="text-muted-foreground">
               {search
                  ? 'No results found for your search.'
                  : 'No documents found.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {documents.map((document: Document) => (
                  <DocumentCard document={document} key={document.id} />
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
