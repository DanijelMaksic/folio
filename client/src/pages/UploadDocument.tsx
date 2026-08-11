import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Document } from '@server/db/schema/index.js';
import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@server/trpc/router';

export default function UploadDocument() {
   const navigate = useNavigate();
   const [title, setTitle] = useState('');
   const [description, setDescription] = useState('');
   const [file, setFile] = useState<File | null>(null);
   const [error, setError] = useState('');

   const upload = trpc.documents.upload.useMutation({
      onSuccess: (doc: Document) => navigate(`/documents/${doc.id}`),
      onError: (err: TRPCClientError<AppRouter>) => setError(err.message),
   });

   const handleSubmit = async () => {
      if (!file || !title) return;

      const reader = new FileReader();
      reader.onload = () => {
         const base64 = reader.result as string;
         upload.mutate({
            title,
            description,
            fileBase64: base64,
            fileType: file.type,
         });
      };
      reader.readAsDataURL(file);
   };

   return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
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
            <Label htmlFor="file">File</Label>
            <Input
               id="file"
               type="file"
               accept="image/*,.pdf"
               onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <Button
            onClick={handleSubmit}
            disabled={upload.isPending || !file || !title}
         >
            {upload.isPending ? 'Uploading...' : 'Upload'}
         </Button>
      </div>
   );
}
