import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { zodResolver } from '@/lib/zod-resolver';
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
import { ImageIcon, Paperclip, FileText, X } from 'lucide-react';
import {
   EditFormInput,
   editFormSchema,
   IMAGES_MAX_TOTAL_BYTES,
   PDF_MAX_BYTES,
} from '@shared';

interface SelectedFile {
   file: File;
   previewUrl: string | null; // object URL for images, null for PDF
}

const DESCRIPTION_MAX = 1000;

const formatSize = (bytes: number) => {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toBase64 = (file: File): Promise<string> =>
   new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
   });

export default function UploadDocument() {
   const navigate = useNavigate();
   const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
   const [fileType, setFileType] = useState<'image' | 'pdf'>('image');
   const [fileError, setFileError] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const {
      register,
      handleSubmit,
      setError,
      watch,
      formState: { errors },
   } = useForm<EditFormInput>({
      resolver: zodResolver(editFormSchema),
      mode: 'onChange',
      defaultValues: { title: '', description: '' },
   });

   const titleLength = watch('title')?.length ?? 0;
   const descriptionLength = watch('description')?.length ?? 0;

   const upload = trpc.documents.upload.useMutation({
      onSuccess: (document) => navigate(`/documents/${document?.id}`),
      onError: (err) => setError('root', { message: err.message }),
   });

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files ?? []);
      if (incoming.length === 0) return;

      // Reset input so the same file can be re-added after removal
      e.target.value = '';

      if (incoming[0].type === 'application/pdf') {
         if (incoming[0].size > PDF_MAX_BYTES) {
            setFileError(
               `PDF is too large (${formatSize(incoming[0].size)}). Maximum size is ${formatSize(PDF_MAX_BYTES)}.`,
            );
            return;
         }
         setFileError('');
         setFileType('pdf');
         setSelectedFiles([{ file: incoming[0], previewUrl: null }]);
      } else {
         // If a PDF was selected, picking images replaces it instead of mixing with it
         const base = fileType === 'pdf' ? [] : selectedFiles;

         const existing = new Set(
            base.map((f) => `${f.file.name}-${f.file.size}`),
         );
         const fresh = incoming.filter(
            (f) => !existing.has(`${f.name}-${f.size}`),
         );

         const currentTotal = base.reduce((s, f) => s + f.file.size, 0);
         const addedTotal = fresh.reduce((s, f) => s + f.size, 0);

         const tooBig = fresh.find((f) => f.size > IMAGES_MAX_TOTAL_BYTES);

         if (tooBig) {
            setFileError(
               `"${tooBig.name}" is too large (${formatSize(tooBig.size)}). Images must be under ${formatSize(IMAGES_MAX_TOTAL_BYTES)}.`,
            );
            return;
         }

         if (currentTotal + addedTotal > IMAGES_MAX_TOTAL_BYTES) {
            setFileError(
               `Images are too large together (limit ${formatSize(IMAGES_MAX_TOTAL_BYTES)}). Remove some or upload them in smaller batches.`,
            );
            return;
         }

         setFileError('');
         setFileType('image');
         setSelectedFiles([
            ...base,
            ...fresh.map((f) => ({
               file: f,
               previewUrl: URL.createObjectURL(f),
            })),
         ]);
      }
   };

   const removeFile = (index: number) => {
      setFileError('');
      setSelectedFiles((prev) => {
         const updated = [...prev];
         const removed = updated.splice(index, 1)[0];
         if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
         return updated;
      });
   };

   const onSubmit = async ({ title, description }: EditFormInput) => {
      setFileError('');

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
         setFileError('Failed to read file(s). Please try again.');
      }
   };

   const isPdf = fileType === 'pdf' && selectedFiles.length > 0;

   return (
      <form
         onSubmit={handleSubmit(onSubmit)}
         noValidate
         className="max-w-lg mx-auto p-6 space-y-4 border border-gray-200 rounded-md mt-12"
      >
         <h1 className="text-2xl font-semibold">Upload Document</h1>

         <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
               id="title"
               aria-invalid={!!errors.title}
               {...register('title')}
            />
            <div className="flex justify-between text-sm">
               <p className="text-destructive">{errors?.title?.message}</p>

               {titleLength > 200 && (
                  <span
                     className={`${titleLength! <= 225 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                  >
                     {titleLength}/225
                  </span>
               )}
            </div>
         </div>

         <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
               id="description"
               aria-invalid={!!errors.description}
               {...register('description')}
            />
            <div className="flex justify-between text-sm">
               <p className="text-destructive">
                  {errors?.description?.message}
               </p>

               {descriptionLength > 900 && (
                  <span
                     className={`${descriptionLength! <= 1000 ? 'text-muted-foreground' : 'text-destructive'} tabular-nums`}
                  >
                     {descriptionLength}/1000
                  </span>
               )}
            </div>
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

            <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => fileInputRef.current?.click()}
            >
               <Paperclip className="w-4 h-4 mr-2" />
               {isPdf
                  ? 'Replace PDF'
                  : selectedFiles.length === 0
                    ? 'Attach file'
                    : 'Add another image'}
            </Button>

            {fileError && (
               <p className="text-sm text-destructive">{fileError}</p>
            )}
         </div>

         {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
         )}

         <Button
            type="submit"
            disabled={
               upload.isPending || titleLength > 225 || descriptionLength > 1000
            }
         >
            {upload.isPending ? 'Uploading...' : 'Upload'}
         </Button>
      </form>
   );
}
