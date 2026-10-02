import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
   Attachment,
   AttachmentAction,
   AttachmentActions,
   AttachmentContent,
   AttachmentDescription,
   AttachmentMedia,
   AttachmentTitle,
} from '@/components/ui/attachment';
import { Paperclip, X } from 'lucide-react';

interface ReplaceImageModalProps {
   pageId: string;
   documentId: string;
   pageNumber: number;
   onClose: () => void;
}

function ReplaceImageModal({
   pageId,
   documentId,
   pageNumber,
   onClose,
}: ReplaceImageModalProps) {
   const [selectedFile, setSelectedFile] = useState<{
      file: File;
      previewUrl: string;
   } | null>(null);
   const [error, setError] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const utils = trpc.useUtils();

   const replaceImage = trpc.pages.replaceImage.useMutation({
      onSuccess: () => {
         utils.pages.getByPageNumber.invalidate({ documentId, pageNumber });
         onClose();
      },
      onError: (err) => setError(err.message),
   });

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (selectedFile) URL.revokeObjectURL(selectedFile.previewUrl);
      setSelectedFile({ file, previewUrl: URL.createObjectURL(file) });
   };

   const removeFile = () => {
      if (selectedFile) URL.revokeObjectURL(selectedFile.previewUrl);
      setSelectedFile(null);
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
      if (!selectedFile) return;
      setError('');

      try {
         const fileBase64 = await toBase64(selectedFile.file);
         replaceImage.mutate({ pageId, fileBase64 });
      } catch {
         setError('Failed to read file. Please try again.');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
         <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4 border">
            <h2 className="text-lg font-semibold">Change Page Image</h2>

            <div className="space-y-2">
               <Label>New Image</Label>

               <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
               />

               {selectedFile ? (
                  <Attachment orientation="vertical">
                     <AttachmentMedia variant="image">
                        <img
                           src={selectedFile.previewUrl}
                           alt={selectedFile.file.name}
                        />
                     </AttachmentMedia>
                     <AttachmentContent>
                        <AttachmentTitle>
                           {selectedFile.file.name}
                        </AttachmentTitle>
                        <AttachmentDescription>
                           {formatSize(selectedFile.file.size)}
                        </AttachmentDescription>
                     </AttachmentContent>
                     <AttachmentActions>
                        <AttachmentAction
                           aria-label="Remove"
                           onClick={removeFile}
                        >
                           <X />
                        </AttachmentAction>
                     </AttachmentActions>
                  </Attachment>
               ) : (
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => fileInputRef.current?.click()}
                  >
                     <Paperclip className="w-4 h-4 mr-2" />
                     Attach image
                  </Button>
               )}

               {selectedFile && (
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => fileInputRef.current?.click()}
                  >
                     <Paperclip className="w-4 h-4 mr-2" />
                     Choose different image
                  </Button>
               )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>
                  Cancel
               </Button>
               <Button
                  onClick={handleSubmit}
                  disabled={replaceImage.isPending || !selectedFile}
               >
                  {replaceImage.isPending ? 'Uploading...' : 'Change Image'}
               </Button>
            </div>
         </div>
      </div>
   );
}

export default ReplaceImageModal;
