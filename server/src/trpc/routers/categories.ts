import { db } from '@/db/index.js';
import { categories } from '@/db/schema/categories.js';
import { editorProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   createCategorySchema,
   deleteCategorySchema,
   updateCategorySchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { asc, eq, sql } from 'drizzle-orm';

const slugify = (s: string) =>
   s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

export const categoriesRouter = router({
   list: publicProcedure.query(() =>
      db
         .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            documentCount: sql<number>`(
               SELECT COUNT(*) FROM documents d WHERE d.category_id = categories.id
               )`.mapWith(Number),
            collectionCount: sql<number>`(
                SELECT COUNT(*) FROM collections c WHERE c.category_id = categories.id
               )`.mapWith(Number),
            })
         .from(categories)
         .orderBy(asc(sql`lower(${categories.name})`), asc(categories.id)),
   ),

   create: editorProcedure
      .input(createCategorySchema)
      .mutation(async ({ input }) => {
         const slug = slugify(input.name);
         if (!slug)
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Invalid name',
            });
         try {
            const [row] = await db
               .insert(categories)
               .values({ name: input.name, slug })
               .returning();
            return row;
         } catch (e) {
            if ((e as { code?: string }).code === '23505')
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'Category already exists',
               });
            throw e;
         }
      }),

   update: editorProcedure
      .input(updateCategorySchema)
      .mutation(async ({ input }) => {
         const slug = slugify(input.name);
         if (!slug)
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Invalid name',
            });

         try {
            const [row] = await db
               .update(categories)
               .set({ name: input.name, slug })
               .where(eq(categories.id, input.id))
               .returning();

            if (!row)
               throw new TRPCError({
                  code: 'NOT_FOUND',
                  message: 'Category not found',
               });
            return row;
         } catch (e) {
            if ((e as { code?: string }).code === '23505')
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'Category already exists',
               });
            throw e;
         }
      }),

   delete: editorProcedure
      .input(deleteCategorySchema)
      .mutation(async ({ input }) => {
         const [row] = await db
            .delete(categories)
            .where(eq(categories.id, input.id))
            .returning({ id: categories.id });

         if (!row)
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Category not found',
            });
         return { id: row.id };
      }),
});
