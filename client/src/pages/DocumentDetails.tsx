import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '@/components/ui/button';
import { useSession } from '../lib/auth-client';
import { Collection, isContributor, isEditor } from '@shared';
import ReviewPanel from '@/components/documents/ReviewPanel';
import DocumentTabs from '@/components/documents/DocumentTabs';
import { useState } from 'react';
import { TRPCClientError } from '@trpc/client';
import { AppRouter } from '@server/trpc/router';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function DocumentDetails() {
   const [editError, setEditError] = useState('');
   const [deleteError, setDeleteError] = useState('');
   const [collectionError, setCollectionError] = useState('');
   const [isEditOpen, setIsEditOpen] = useState(false);
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
   const [isCollectionOpen, setIsCollectionOpen] = useState(false);
   const [editTitle, setEditTitle] = useState('');
   const [editDescription, setEditDescription] = useState('');

   const { id } = useParams<{ id: string }>();
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();
   const canTranscribe = isContributor(user?.globalRole);
   const editor = isEditor(user?.globalRole);

   const utils = trpc.useUtils();

   const { data: document, isLoading } = trpc.documents.getById.useQuery({
      id: id!,
   });

   const [selectedCollectionId, setSelectedCollectionId] = useState(
      document?.collectionId ?? null,
   );

   const inCollection = !!document?.collectionId;

   const { data: collections, isPending } =
      trpc.collections.getCurrentUserCollections.useQuery({
         page: 1,
         limit: 9,
         userId: user?.id,
      });

   const isMyDocument = document?.uploadedBy === user?.id;

   const editDocument = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsEditOpen(false);
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setEditError(err.message);
      },
   });

   const deleteDocument = trpc.documents.delete.useMutation({
      onSuccess: () => {
         navigate('/documents', { replace: true });
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setDeleteError(err.message);
      },
   });

   const addToCollection = trpc.documents.update.useMutation({
      onSuccess: () => {
         utils.documents.getById.invalidate({ id: id! });
         setIsCollectionOpen(false);
      },
      onError: (err: TRPCClientError<AppRouter>) => {
         setCollectionError(err.message);
      },
   });

   const { data: submittedTranscription } =
      trpc.transcriptions.getSubmittedByDocument.useQuery(
         {
            documentId: id!,
         },
         {
            enabled: isEditor(user?.globalRole),
         },
      );

   const handleEditOpen = () => {
      setEditTitle(document?.title ?? '');
      setEditDescription(document?.description ?? '');
      setIsEditOpen(true);
   };

   const handleEditSubmit = () => {
      editDocument.mutate({
         id: id!,
         title: editTitle,
         description: editDescription,
      });
   };

   const handleAddToCollection = () => {
      addToCollection.mutate({
         id: id!,
         collectionId: selectedCollectionId,
      });
   };

   const handleDelete = async () => {
      deleteDocument.mutate({ id });
   };

   if (isLoading) return <p>Loading...</p>;

   if (!document) return <p>Document not found</p>;

   return (
      <div className="max-w-full mx-auto py-6 px-12 space-y-3">
         <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{document.title}</h1>

            {canTranscribe && isMyDocument && !editor && (
               <div className="flex gap-3 items-center justify-center">
                  <Button
                     onClick={() => {
                        setIsCollectionOpen(true);
                     }}
                  >
                     {inCollection ? 'Change collection' : 'Add to collection'}
                  </Button>

                  <Button onClick={handleEditOpen}>Edit</Button>

                  <Button
                     className="bg-red-700"
                     onClick={() => setIsDeleteOpen(true)}
                  >
                     Delete
                  </Button>
               </div>
            )}

            {editor && (
               <div className="flex gap-3 items-center justify-center">
                  <Button
                     onClick={() => {
                        setIsCollectionOpen(true);
                     }}
                  >
                     Add to collection
                  </Button>

                  <Button onClick={handleEditOpen}>Edit</Button>

                  <Button
                     className="bg-red-700"
                     onClick={() => setIsDeleteOpen(true)}
                  >
                     Delete
                  </Button>
               </div>
            )}
         </div>

         {id && <DocumentTabs canTranscribe={canTranscribe} documentId={id} />}

         <Outlet />

         {isEditor(session?.user?.globalRole) &&
            id &&
            submittedTranscription &&
            submittedTranscription.userId !== session?.user?.id && (
               <ReviewPanel
                  submittedTranscription={submittedTranscription}
                  documentId={id}
               />
            )}

         {isEditOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
                  <h2 className="text-lg font-semibold">Edit Document</h2>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Title</label>
                     <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Description</label>
                     <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                     />
                  </div>

                  {editError && (
                     <p className="text-sm text-destructive">{editError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setIsEditOpen(false);
                           setEditError('');
                        }}
                     >
                        Cancel
                     </Button>

                     <Button
                        onClick={handleEditSubmit}
                        disabled={editDocument.isPending}
                     >
                        {editDocument.isPending ? 'Saving...' : 'Save'}
                     </Button>
                  </div>
               </div>
            </div>
         )}

         {isDeleteOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
                  <h2 className="text-lg font-semibold">Delete Document</h2>

                  {deleteError && (
                     <p className="text-sm text-destructive">{deleteError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setIsDeleteOpen(false);
                           setDeleteError('');
                        }}
                     >
                        Cancel
                     </Button>

                     <Button
                        onClick={handleDelete}
                        disabled={deleteDocument.isPending}
                        className="bg-red-700"
                     >
                        {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
                     </Button>
                  </div>
               </div>
            </div>
         )}

         {isCollectionOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
                  <h2 className="text-lg font-semibold">Add to collection</h2>

                  <div className="grid grid-cols-3 gap-3">
                     {isPending ? (
                        <p>Loading...</p>
                     ) : (
                        collections?.map((collection: Collection) => (
                           <button
                              key={collection.id}
                              onClick={() => {
                                 setSelectedCollectionId(
                                    selectedCollectionId === collection.id
                                       ? null
                                       : collection.id,
                                 );
                              }}
                              className={`border border-gray-300 rounded-md p-4 ${collection.id === selectedCollectionId && 'bg-gray-300'}`}
                           >
                              {collection.title}
                           </button>
                        ))
                     )}
                  </div>

                  {collectionError && (
                     <p className="text-sm text-destructive">
                        {collectionError}
                     </p>
                  )}

                  <div className="flex justify-end gap-2">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setIsCollectionOpen(false);
                           setCollectionError('');
                        }}
                     >
                        Cancel
                     </Button>

                     <Button
                        onClick={handleAddToCollection}
                        disabled={addToCollection.isPending}
                     >
                        {addToCollection.isPending ? 'Saving...' : 'Save'}
                     </Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
