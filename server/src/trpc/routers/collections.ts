import { collections } from '@/db/schema/collections.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   createCollectionSchema,
   isContributor,
   listCollectionsSchema,
   updateCollectionSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import z from 'zod';

export const collectionsRouter = router({
   create: protectedProcedure
      .input(createCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only editors and above can create collections',
            });
         }

         const [collection] = await ctx.db
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

         const results = await ctx.db
            .select()
            .from(collections)
            .limit(input.limit)
            .offset(offset)
            .orderBy(desc(collections.createdAt));

         return results;
      }),

   getById: publicProcedure
      .input(
         z.object({
            id: z.string(),
         }),
      )
      .query(async ({ ctx, input }) => {
         const [collection] = await ctx.db
            .select()
            .from(collections)
            .where(eq(collections.id, input.id));

         if (!collection) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }
         return collection;
      }),

   update: protectedProcedure
      .input(updateCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only editors and above can edit collections',
            });
         }

         const { id, ...fields } = input;

         const [updated] = await ctx.db
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
               message: 'Only editors and above can delete collections',
            });
         }

         const [deleted] = await ctx.db
            .delete(collections)
            .where(eq(collections.id, input.id))
            .returning();

         if (!deleted) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }

         return deleted;
      }),
});
