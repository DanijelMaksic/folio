import { collections } from '@/db/schema/collections.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   createCollectionSchema,
   isEditor,
   listCollectionsSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { desc } from 'drizzle-orm';

export const collectionsRouter = router({
   create: protectedProcedure
      .input(createCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isEditor(ctx.user.globalRole)) {
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
});
