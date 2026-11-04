import { z } from 'zod';

export const getPublicProfileSchema = z.object({
   username: z.string().trim().min(1),
});

export const listUserNotesSchema = z.object({
   userId: z.string().min(1),
   search: z.string().trim().max(100).optional(),
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(50).default(10),
   sort: z.enum(['newest', 'oldest']).default('newest'),
});
