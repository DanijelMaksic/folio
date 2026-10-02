import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
   Attachment,
   AttachmentAction,
   AttachmentActions,
   AttachmentContent,
   AttachmentDescription,
   AttachmentGroup,
   AttachmentMedia,
   AttachmentTitle,
} from '@/components/ui/attachment';
import { Paperclip, X } from 'lucide-react';

interface SelectedFile {
   file: File;
   previewUrl: string;
}

interface AddPagesModalProps {
   documentId: string;
   onSuccess: () => void;
   onClose: () => void;
}

function AddPagesModal({ documentId, onSuccess, onClose }: AddPagesModalProps) {
   const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
   const [error, setError] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const utils = trpc.useUtils();

   const addPages = trpc.pages.addPages.useMutation({
      onSuccess: () => {
         utils.pages.getByDocument.invalidate({ documentId });
         (onSuccess(), onClose());
      },
      onError: (err) => setError(err.message),
   });

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files ?? []);
      e.target.value = '';

      setSelectedFiles((prev) => {
         const existing = new Set(
            prev.map((f) => `${f.file.name}-${f.file.size}`),
         );
         const toAdd = incoming
            .filter((f) => !existing.has(`${f.name}-${f.size}`))
            .map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
         return [...prev, ...toAdd];
      });
   };

   const removeFile = (index: number) => {
      setSelectedFiles((prev) => {
         const updated = [...prev];
         URL.revokeObjectURL(updated.splice(index, 1)[0].previewUrl);
         return updated;
      });
   };

   const toBase64 = (file: File): Promise<string> =>
      new Promise((res, rej) => {
         const reader = new FileReader();
         reader.onload = () => res(reader.result as string);
         reader.onerror = rej;
         reader.readAsDataURL(file);
      });

   const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   };

   const handleSubmit = async () => {
      if (selectedFiles.length === 0) return;
      setError('');

      try {
         const files = await Promise.all(
            selectedFiles.map((sf) => toBase64(sf.file)),
         );
         addPages.mutate({ documentId, files });
      } catch {
         setError('Failed to read files. Please try again.');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4 border">
            <h2 className="text-lg font-semibold">Add Pages</h2>

            <div className="space-y-2">
               <Label>Images</Label>

               <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
               />

               {selectedFiles.length > 0 && (
                  <AttachmentGroup className="flex-wrap">
                     {selectedFiles.map((sf, i) => (
                        <Attachment
                           key={`${sf.file.name}-${i}`}
                           orientation="vertical"
                        >
                           <AttachmentMedia variant="image">
                              <img src={sf.previewUrl} alt={sf.file.name} />
                           </AttachmentMedia>
                           <AttachmentContent>
                              <AttachmentTitle>{sf.file.name}</AttachmentTitle>
                              <AttachmentDescription>
                                 {formatSize(sf.file.size)}
                              </AttachmentDescription>
                           </AttachmentContent>
                           <AttachmentActions>
                              <AttachmentAction
                                 aria-label={`Remove ${sf.file.name}`}
                                 onClick={() => removeFile(i)}
                              >
                                 <X />
                              </AttachmentAction>
                           </AttachmentActions>
                        </Attachment>
                     ))}
                  </AttachmentGroup>
               )}

               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {selectedFiles.length === 0
                     ? 'Attach images'
                     : 'Add another image'}
               </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>
                  Cancel
               </Button>
               <Button
                  onClick={handleSubmit}
                  disabled={addPages.isPending || selectedFiles.length === 0}
               >
                  {addPages.isPending ? 'Uploading...' : 'Add Pages'}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default AddPagesModal;
