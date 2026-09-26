import { z } from 'zod';

export const uploadDocumentSchema = z.object({
   title: z
      .string()
      .min(1, 'Title is required')
      .max(225, 'Title cannot be longer than 255 characters'),
   description: z
      .string()
      .max(1000, 'Description cannot be longer than 1000 characters')
      .optional(),
   fileBase64: z.string(),
   fileType: z.enum(['image', 'pdf']),
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
   title: z.string().min(1).max(225).optional(),
   description: z.string().max(1000).optional(),
   collectionId: z.string().nullable().optional(),
});

export const documentPageSchema = z.object({
   id: z.string(),
   documentId: z.string(),
   pageNumber: z.number(),
   imageUrl: z.string(),
   cloudinaryPublicId: z.string(),
   createdAt: z.string(),
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
export type DocumentPage = z.infer<typeof documentPageSchema>;
