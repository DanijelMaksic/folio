import { trpc } from '@/lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Document, isContributor } from '@shared';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { DocumentCard } from '@/components/documents/DocumentCard.js';
import { Input } from '@/components/ui/input';
import { ButtonGroup } from '@/components/ui/button-group';
import { Plus, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import SearchBar from '@/components/shared/SearchBar';

export default function Documents() {
   const navigate = useNavigate();
   const { data: session } = useSession();
   const user = session?.user;
   const canTranscribe = isContributor(user?.globalRole);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');

   const { data: documents, isLoading } = trpc.documents.list.useQuery({
      page: 1,
      limit: 20,
   });

   useEffect(() => {
      const t = setTimeout(() => setDebouncedSearch(search), 500);
      return () => clearTimeout(t);
   }, [search]);

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

   const isSearchActive = debouncedSearch.length > 0;
   const displayedDocuments = isSearchActive ? searchResults : documents;

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>

            <SearchBar
               placeholder="Search documents..."
               value={search}
               onChange={setSearch}
            />

            <ButtonGroup className="border border-gray-400 rounded-md p-0.5">
               <Button className="bg-gray-200 text-black hover:text-white rounded-md">
                  Transcribed
               </Button>
               <Button className="bg-gray-0 text-black rounded-md hover:text-white">
                  Not Transcribed
               </Button>
            </ButtonGroup>

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

         {!displayedDocuments?.length ? (
            <p className="text-muted-foreground">
               {isSearchActive ? 'No documents found.' : 'No documents yet.'}
            </p>
         ) : (
            <div className="grid grid-cols-3 gap-4 transition-opacity duration-150">
               {displayedDocuments.map((doc: Document) => (
                  <DocumentCard doc={doc} key={doc.id} />
               ))}
            </div>
         )}
      </div>
   );
}
