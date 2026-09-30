import { z } from 'zod';

export const createCollectionSchema = z.object({
   title: z
      .string()
      .min(1, 'Title is required')
      .max(225, 'Title cannot be longer than 255 characters'),
   description: z
      .string()
      .max(1000, 'Description cannot be longer than 1000 characters')
      .optional(),
});

export const listCollectionsSchema = z.object({
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(100).default(20),
   search: z.string().optional(),
});

export const updateCollectionSchema = createCollectionSchema
   .partial()
   .extend({ id: z.string(), collectionId: z.string().nullable().optional() });

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type ListCollectionInput = z.infer<typeof listCollectionsSchema>;
