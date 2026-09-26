import { Button } from '@/components/ui/button';

interface CollectionPickerModalProps {
   isLoadingCollections: boolean;
   addToColPending: boolean;
   selectedId: string | null;
   collections?: { id: string; title: string }[];
   error?: string;
   onClose: () => void;
   onSelect: (id: string | null) => void;
   onSave: () => void;
}

function CollectionPickerModal({
   isLoadingCollections,
   addToColPending,
   collections,
   error,
   onSelect,
   selectedId,
   onClose,
   onSave,
}: CollectionPickerModalProps) {
   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Add to collection</h2>

            <div className="grid grid-cols-3 gap-3">
               {isLoadingCollections ? (
                  <p>Loading...</p>
               ) : (
                  collections?.map((collection) => (
                     <button
                        key={collection.id}
                        onClick={() => {
                           onSelect(
                              selectedId === collection.id
                                 ? null
                                 : collection.id,
                           );
                        }}
                        className={`border border-gray-300 rounded-md p-4 ${collection.id === selectedId && 'bg-gray-300'}`}
                     >
                        {collection.title}
                     </button>
                  ))
               )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>
                  Cancel
               </Button>

               <Button onClick={onSave} disabled={addToColPending}>
                  {addToColPending ? 'Saving...' : 'Save'}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default CollectionPickerModal;
