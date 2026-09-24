import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { collections } from '@/db/schema/collections.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   createCollectionSchema,
   isContributor,
   listCollectionsSchema,
   listMyCollectionsSchema,
   updateCollectionSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { count, desc, eq, ilike, sql } from 'drizzle-orm';
import z from 'zod';

export const collectionsRouter = router({
   create: protectedProcedure
      .input(createCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can create collections',
            });
         }

         const [collection] = await db
            .insert(collections)
            .values({
               title: input.title,
               description: input.description ?? null,
               createdBy: ctx.user.id,
            })
            .returning();

         return collection;
      }),

   list: publicProcedure
      .input(listCollectionsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;
         const where = input.search
            ? ilike(collections.title, `%${input.search}%`)
            : undefined;

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: collections.id,
                  title: collections.title,
                  description: collections.description,
                  createdBy: collections.createdBy,
                  creatorName: user.name,
                  coverImageUrl: sql<string | null>`(
                     SELECT dp.image_url FROM document_pages dp
                     INNER JOIN documents d ON d.id = dp.document_id
                     WHERE d.collection_id = ${collections.id}
                     AND dp.page_number = 1
                     ORDER BY d.created_at ASC
                     LIMIT 1
                  )`,
               })
               .from(collections)
               .innerJoin(user, eq(user.id, collections.createdBy))
               .where(where)
               .limit(input.limit)
               .offset(offset)
               .orderBy(desc(collections.createdAt)),

            db.select({ total: count() }).from(collections).where(where),
         ]);

         return {
            collections: results,
            totalCount: Number(total),
            totalPages: Math.ceil(Number(total) / input.limit),
         };
      }),

   getById: publicProcedure
      .input(
         z.object({
            id: z.string(),
         }),
      )
      .query(async ({ ctx, input }) => {
         const [collection] = await db
            .select()
            .from(collections)
            .where(eq(collections.id, input.id));

         if (!collection) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }
         return collection;
      }),

   // Fetches the current user's collections
   getCurrentUserCollections: protectedProcedure
      .input(listMyCollectionsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const result = await db
            .select()
            .from(collections)
            .where(eq(collections.createdBy, input.userId))
            .limit(input.limit)
            .offset(offset)
            .orderBy(desc(collections.createdAt));

         return result ?? null;
      }),

   update: protectedProcedure
      .input(updateCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can edit collections',
            });
         }

         const { id, ...fields } = input;

         const [updated] = await db
            .update(collections)
            .set(fields)
            .where(eq(collections.id, id))
            .returning();

         if (!updated) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }

         return updated;
      }),

   delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can delete collections',
            });
         }

         const [deleted] = await db
            .delete(collections)
            .where(eq(collections.id, input.id))
            .returning();

         if (!deleted) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }

         return deleted;
      }),
});
