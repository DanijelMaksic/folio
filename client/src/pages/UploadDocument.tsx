import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '@server/trpc/router';
import { ImageIcon, Paperclip, FileText, X } from 'lucide-react';

interface SelectedFile {
   file: File;
   previewUrl: string | null; // object URL for images, null for PDF
}

export default function UploadDocument() {
   const navigate = useNavigate();
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
   const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
   const [error, setError] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const upload = trpc.documents.upload.useMutation({
      onSuccess: (document) => navigate(`/documents/${document?.id}`),
      onError: (err: TRPCClientErrorLike<AppRouter>) => setError(err.message),
   });

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files ?? []);
      if (incoming.length === 0) return;

      // Reset input so the same file can be re-added after removal
      e.target.value = '';

      if (incoming[0].type === 'application/pdf') {
         // PDF: replace entirely — only one allowed
         setFileType('pdf');
         setSelectedFiles([{ file: incoming[0], previewUrl: null }]);
      } else {
         // Images: append, avoiding duplicates by name+size
         setFileType('image');
         setSelectedFiles((prev) => {
            const existing = new Set(
               prev.map((f) => `${f.file.name}-${f.file.size}`),
            );
            const toAdd = incoming
               .filter((f) => !existing.has(`${f.name}-${f.size}`))
               .map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }));
            return [...prev, ...toAdd];
         });
      }
   };

   const removeFile = (index: number) => {
      setSelectedFiles((prev) => {
         const updated = [...prev];
         const removed = updated.splice(index, 1)[0];
         if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
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
      if (!title) return;
      setError('');

      try {
         if (selectedFiles.length === 0) {
            upload.mutate({ title, description });
         } else if (fileType === 'pdf') {
            const fileBase64 = await toBase64(selectedFiles[0].file);
            upload.mutate({ fileType: 'pdf', title, description, fileBase64 });
         } else {
            const files = await Promise.all(
               selectedFiles.map((sf) => toBase64(sf.file)),
            );
            upload.mutate({ fileType: 'image', title, description, files });
         }
      } catch {
         setError('Failed to read file(s). Please try again.');
      }
   };

   const isPdf = fileType === 'pdf' && selectedFiles.length > 0;
   const canAddMore = !isPdf; // once a PDF is selected, hide the add button

   return (
      <div className="max-w-lg mx-auto p-6 space-y-4 border border-gray-200 rounded-md mt-12">
         <h1 className="text-2xl font-semibold">Upload Document</h1>

         <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
               id="title"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
            />
         </div>

         <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
               id="description"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
            />
         </div>

         <div className="space-y-2">
            <Label>Files</Label>

            {/* Hidden file input */}
            <input
               ref={fileInputRef}
               type="file"
               accept="image/*,.pdf"
               multiple
               className="hidden"
               onChange={handleFileChange}
            />

            {/* Attachment list */}
            {selectedFiles.length > 0 && (
               <AttachmentGroup className="flex-wrap">
                  {selectedFiles.map((sf, i) => (
                     <Attachment
                        key={`${sf.file.name}-${i}`}
                        orientation="vertical"
                     >
                        <AttachmentMedia
                           variant={sf.previewUrl ? 'image' : 'icon'}
                        >
                           {sf.previewUrl ? (
                              <img src={sf.previewUrl} alt={sf.file.name} />
                           ) : (
                              <FileText />
                           )}
                        </AttachmentMedia>

                        <AttachmentContent>
                           <AttachmentTitle>{sf.file.name}</AttachmentTitle>
                           <AttachmentDescription>
                              {sf.previewUrl ? 'Image' : 'PDF'} ·{' '}
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

            {/* Add file button */}
            {canAddMore && (
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {selectedFiles.length === 0
                     ? 'Attach file'
                     : 'Add another image'}
               </Button>
            )}

            {isPdf && (
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Replace PDF
               </Button>
            )}
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <Button onClick={handleSubmit} disabled={upload.isPending || !title}>
            {upload.isPending ? 'Uploading...' : 'Upload'}
         </Button>
      </div>
   );
}
