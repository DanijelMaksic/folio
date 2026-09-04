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
});

export const listDocumentsSchema = z.object({
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(100).default(20),
});

export const searchDocumentsSchema = z.object({
   query: z.string().min(1).max(200),
});

export const documentSchema = z.object({
   id: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   uploadedBy: z.string(),
   version: z.number().int().min(1),
   cloudinaryPublicId: z.string(),
   cloudinaryUrl: z.string(),
   status: z.enum(['processing', 'ready', 'failed']),
   createdAt: z.date(),
   updatedAt: z.date(),
   uploaderName: z.string(),
   hasApprovedTranscription: z.boolean(),
   collectionId: z.string().nullable().optional(),
});

export const updateDocumentSchema = uploadDocumentSchema
   .partial()
   .extend({ id: z.string(), collectionId: z.string().nullable().optional() });

export type UploadedDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
export type Document = z.infer<typeof documentSchema>;
