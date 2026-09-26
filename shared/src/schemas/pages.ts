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

export type Page = z.infer<typeof pageSchema>;
