import { z } from 'zod';

export const pageSchema = z.object({
   id: z.string(),
   documentId: z.string().nullable(),
   title: z.string(),
   description: z.string().nullable(),
   pageNumber: z.number(),
   imageUrl: z.string(),
   cloudinaryPublicId: z.string(),
   createdAt: z.string(),
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

export type Page = z.infer<typeof pageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
