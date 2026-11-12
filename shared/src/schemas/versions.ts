import { z } from 'zod';

export const listVersionsSchema = z.object({
   pageId: z.string(),
   sort: z.enum(['newest', 'oldest']).default('newest'),
   limit: z.number().int().min(1).max(50).default(30),
});

export const listUserVersionsSchema = z.object({
   userId: z.string().min(1),
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(50).default(20),
   sort: z.enum(['newest', 'oldest']).default('newest'),
});

export type ListVersionInput = z.infer<typeof listVersionsSchema>;
export type ListUserVersionInput = z.infer<typeof listUserVersionsSchema>;
