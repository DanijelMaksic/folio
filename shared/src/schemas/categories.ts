import { z } from 'zod';

export const categoryNameSchema = z.string().trim().min(2).max(40);

export const createCategorySchema = z.object({ name: categoryNameSchema });

export const updateCategorySchema = z.object({
   id: z.string(),
   name: categoryNameSchema,
});

export const deleteCategorySchema = z.object({ id: z.string() });
