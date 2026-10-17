import { z } from 'zod';

export const PDF_MAX_BYTES = 5 * 1024 * 1024;
// base64 is 4 chars per 3 bytes, plus slack for the "data:application/pdf;base64," prefix
export const PDF_MAX_BASE64_LENGTH = Math.ceil(PDF_MAX_BYTES / 3) * 4 + 100;
export const IMAGES_MAX_TOTAL_BYTES = 6 * 1024 * 1024;

export const uploadDocumentSchema = z
   .object({
      title: z
         .string()
         .min(1, 'Title is required')
         .max(225, 'Title cannot be longer than 255 characters'),
      description: z
         .string()
         .max(1000, 'Description cannot be longer than 1000 characters')
         .optional(),
      fileType: z.enum(['image', 'pdf']).optional(),
      fileBase64: z
         .string()
         .max(PDF_MAX_BASE64_LENGTH, 'PDF is too large. Maximum size is 5 MB')
         .optional(),

      files: z.array(z.string()).optional(),
   })
   .refine((d) => d.fileType !== 'pdf' || !!d.fileBase64, {
      message: 'A PDF file is required',
      path: ['fileBase64'],
   });

export const listDocumentsSchema = z.object({
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(100).default(20),
   search: z.string().optional(),
   status: z
      .enum(['all-documents', 'transcribed', 'not-transcribed'])
      .optional(),
});

export const searchDocumentsSchema = z.object({
   query: z.string().max(200),
   collectionId: z.string().nullable().optional(),
});

export const updateDocumentSchema = z.object({
   id: z.string(),
   title: z
      .string()
      .min(1, 'Title is required')
      .max(225, 'Title cannot be longer than 255 characters')
      .optional(),
   description: z
      .string()
      .max(1000, 'Description cannot be longer than 1000 characters')
      .optional(),
   collectionId: z.string().nullable().optional(),
});

export const documentSchema = z.object({
   id: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   uploadedBy: z.string(),
   status: z.enum(['processing', 'ready', 'failed']),
   createdAt: z.string(),
   updatedAt: z.string(),
   uploaderName: z.string().nullable().optional(),
   collectionId: z.string().nullable().optional(),
   pageCount: z.number().optional(),
   coverImageUrl: z.string().nullable().optional(),
});

export type UploadedDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
export type Document = z.infer<typeof documentSchema>;
