import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { collections } from '@/db/schema/collections.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   createCollectionSchema,
   isContributor,
   isEditor,
   listCollectionsSchema,
   updateCollectionSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import z from 'zod';
import { escapeLike } from '@/lib/search.js';
import { getCollectionProgress } from '@/lib/transcription-progress.js';
import { categories } from '@/db/schema/categories.js';
import { assertCategoryExists } from '@/trpc/routers/documents.js';

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

         await assertCategoryExists(input.categoryId);

         const [collection] = await db
            .insert(collections)
            .values({
               title: input.title,
               description: input.description ?? null,
               categoryId: input.categoryId ?? null,
               createdBy: ctx.user.id,
            })
            .returning();

         return collection;
      }),

   list: publicProcedure
      .input(listCollectionsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const term = input.search?.trim();
         const pattern = term ? `%${escapeLike(term)}%` : undefined;

         const documentCountSql = sql<number>`(
          SELECT COUNT(*) FROM documents d
          WHERE d.collection_id = ${collections.id} AND d.status = 'ready'
         )`;

         const orderBy = {
            newest: [desc(collections.createdAt), desc(collections.id)],
            oldest: [asc(collections.createdAt), asc(collections.id)],
            'title-asc': [
               asc(sql`lower(${collections.title})`),
               asc(collections.id),
            ],
            'title-desc': [
               desc(sql`lower(${collections.title})`),
               asc(collections.id),
            ],
            'most-documents': [
               desc(documentCountSql),
               desc(collections.createdAt),
               desc(collections.id),
            ],
         }[input.sort];

         const searchWhere = pattern
            ? or(
                 ilike(collections.title, pattern),
                 ilike(collections.description, pattern),
                 ilike(user.username, pattern),
                 ilike(user.name, pattern),
              )
            : undefined;

         const transcribedDocumentCountSql = sql<number>`(
            SELECT COUNT(*) FROM documents d
            WHERE d.collection_id = ${collections.id}
            AND d.status = 'ready'
            AND EXISTS (SELECT 1 FROM document_pages p WHERE p.document_id = d.id)
            AND NOT EXISTS (
            SELECT 1 FROM document_pages p
            WHERE p.document_id = d.id
            AND NOT EXISTS (
                SELECT 1 FROM transcriptions t
                WHERE t.page_id = p.id AND t.status = 'approved'
                )
                )
            )`;

         const fullyTranscribedSql = sql`(${documentCountSql} > 0 AND ${documentCountSql} = ${transcribedDocumentCountSql})`;

         const transcribedFilter =
            input.status === 'transcribed'
               ? fullyTranscribedSql
               : input.status === 'not-transcribed'
                 ? sql`NOT ${fullyTranscribedSql}`
                 : undefined;

         const where = and(
            input.userId ? eq(collections.createdBy, input.userId) : undefined,
            searchWhere,
            input.categorySlug
               ? eq(categories.slug, input.categorySlug)
               : undefined,
            transcribedFilter,
            input.categoryId
               ? eq(collections.categoryId, input.categoryId)
               : undefined,
         );

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: collections.id,
                  title: collections.title,
                  description: collections.description,
                  createdBy: collections.createdBy,
                  creatorName: user.name,
                  creatorUsername: user.username,
                  createdAt: collections.createdAt,
                  categoryName: categories.name,
                  categorySlug: categories.slug,
                  coverImageUrl: sql<string | null>`(
                     SELECT dp.image_url FROM document_pages dp
                     INNER JOIN documents d ON d.id = dp.document_id
                     WHERE d.collection_id = ${collections.id}
                     AND d.status = 'ready'
                     AND dp.page_number = 1
                     ORDER BY d.created_at DESC
                     LIMIT 1
                  )`,
               })
               .from(collections)
               .leftJoin(user, eq(user.id, collections.createdBy))
               .leftJoin(categories, eq(categories.id, collections.categoryId))
               .where(where)
               .limit(input.limit)
               .offset(offset)
               .orderBy(...orderBy),

            db
               .select({ total: count() })
               .from(collections)
               .leftJoin(user, eq(user.id, collections.createdBy))
               .leftJoin(categories, eq(categories.id, collections.categoryId))
               .where(where),
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
            .select({
               id: collections.id,
               title: collections.title,
               description: collections.description,
               createdBy: collections.createdBy,
               categoryId: collections.categoryId,
               creatorName: user.name,
               creatorUsername: user.username,
               createdAt: collections.createdAt,
               categoryName: categories.name,
               categorySlug: categories.slug,
            })
            .from(collections)
            .leftJoin(user, eq(user.id, collections.createdBy))
            .leftJoin(categories, eq(categories.id, collections.categoryId))
            .where(eq(collections.id, input.id));

         if (!collection) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }
         return collection;
      }),

   getStats: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
         const [collection] = await db
            .select({ id: collections.id })
            .from(collections)
            .where(eq(collections.id, input.id));

         if (!collection) throw new TRPCError({ code: 'NOT_FOUND' });

         return getCollectionProgress(input.id);
      }),

   getCurrentUserCollections: protectedProcedure
      .input(listCollectionsSchema)
      .query(async ({ ctx, input }) => {
         const offset = (input.page - 1) * input.limit;

         const term = input.search?.trim();
         const pattern = term ? `%${escapeLike(term)}%` : undefined;

         const searchFilter = pattern
            ? or(
                 ilike(collections.title, pattern),
                 ilike(collections.description, pattern),
              )
            : undefined;

         const where = and(
            eq(collections.createdBy, ctx.user.id),
            searchFilter,
         );

         const [results, [{ total }]] = await Promise.all([
            db
               .select()
               .from(collections)
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

   update: protectedProcedure
      .input(updateCollectionSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can edit collections',
            });
         }
         await assertCategoryExists(input.categoryId);

         const { id, ...fields } = input;

         const [existing] = await db
            .select({ createdBy: collections.createdBy })
            .from(collections)
            .where(eq(collections.id, id))
            .limit(1);

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

         if (
            existing.createdBy !== ctx.user.id &&
            !isEditor(ctx.user.globalRole)
         ) {
            throw new TRPCError({ code: 'FORBIDDEN' });
         }

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

         const { id } = input;

         const [existing] = await db
            .select({ createdBy: collections.createdBy })
            .from(collections)
            .where(eq(collections.id, id))
            .limit(1);

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

         if (
            existing.createdBy !== ctx.user.id &&
            !isEditor(ctx.user.globalRole)
         ) {
            throw new TRPCError({ code: 'FORBIDDEN' });
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
