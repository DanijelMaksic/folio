import { z } from 'zod';

export const pageSchema = z.object({
   id: z.string(),
   documentId: z.string().nullable().optional(),
   title: z.string(),
   description: z.string().nullable().optional(),
   pageNumber: z.number(),
   imageUrl: z.string(),
   cloudinaryPublicId: z.string().optional(),
   createdAt: z.string(),
   approvedTranscriptionCount: z.number(),
});

export const updatePageSchema = z.object({
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
   imageUrl: z.string().optional(),
});

export const addPagesSchema = z.object({
   documentId: z.string(),
   files: z.array(z.string()).min(1, 'At least one image is required'),
});

export const replaceImageSchema = z.object({
   pageId: z.string(),
   fileBase64: z.string(),
});

export const getByDocumentSchema = z.object({
   documentId: z.string(),
   page: z.number().min(1).default(1),
   limit: z.number().min(1).max(100).default(20),
   search: z.string().optional(),
});

export const getByPageNumberSchema = z.object({
   documentId: z.string(),
   pageNumber: z.number().int().min(1),
});

export type Page = z.infer<typeof pageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type ReplaceImageInput = z.infer<typeof replaceImageSchema>;
export type GetByDocumentInput = z.infer<typeof getByDocumentSchema>;
export type GetByPageNumbeInput = z.infer<typeof getByPageNumberSchema>;
