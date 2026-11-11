import { z } from 'zod';

export const listVersionsSchema = z.object({
   pageId: z.string(),
   sort: z.enum(['newest', 'oldest']).default('newest'),
   limit: z.number().int().min(1).max(50).default(30),
});

export type ListVersionInput = z.infer<typeof listVersionsSchema>;
