import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { isContributor, isEditor, listUserNotesSchema } from '@folio/shared';
import {
   createNoteSchema,
   deleteNoteSchema,
   listNotesSchema,
   updateNoteSchema,
} from '@folio/shared';
import { db } from '@/db/index.js';
import { pages } from '@/db/schema/pages.js';
import { user } from '@/db/schema/auth.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import { notes } from '@/db/schema/notes.js';
import { documents } from '@/db/schema/documents.js';
import { escapeLike } from '@/lib/search.js';
import { documentVisibility } from '@/lib/document-visibility.js';

export const notesRouter = router({
   listByPage: publicProcedure
      .input(listNotesSchema)
      .query(async ({ input }) => {
         const { pageId, page, limit, sort } = input;
         const where = eq(notes.pageId, pageId);
         const order =
            sort === 'newest' ? desc(notes.createdAt) : asc(notes.createdAt);

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: notes.id,
                  pageId: notes.pageId,
                  userId: notes.userId,
                  content: notes.content,
                  createdAt: notes.createdAt,
                  updatedAt: notes.updatedAt,
                  authorName: user.name,
                  authorUsername: user.username,
                  authorAvatar: user.image,
               })
               .from(notes)
               .leftJoin(user, eq(user.id, notes.userId))
               .where(where)
               .orderBy(order, desc(notes.id))
               .limit(limit)
               .offset((page - 1) * limit),
            db.select({ total: count() }).from(notes).where(where),
         ]);

         return {
            notes: results,
            totalCount: total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
         };
      }),

   create: protectedProcedure
      .input(createNoteSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole))
            throw new TRPCError({ code: 'FORBIDDEN' });

         const [page] = await db
            .select({ id: pages.id })
            .from(pages)
            .where(eq(pages.id, input.pageId));
         if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

         const [created] = await db
            .insert(notes)
            .values({
               pageId: input.pageId,
               userId: ctx.user.id,
               content: input.content,
            })
            .returning();

         return created;
      }),

   update: protectedProcedure
      .input(updateNoteSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole))
            throw new TRPCError({ code: 'FORBIDDEN' });

         const [note] = await db
            .select({ id: notes.id, userId: notes.userId })
            .from(notes)
            .where(eq(notes.id, input.id));
         if (!note) throw new TRPCError({ code: 'NOT_FOUND' });

         // Only the author edits
         if (note.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

         const [updated] = await db
            .update(notes)
            .set({ content: input.content })
            .where(eq(notes.id, input.id))
            .returning();
         if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });

         return updated;
      }),

   delete: protectedProcedure
      .input(deleteNoteSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole))
            throw new TRPCError({ code: 'FORBIDDEN' });

         const [note] = await db
            .select({ id: notes.id, userId: notes.userId })
            .from(notes)
            .where(eq(notes.id, input.id));
         if (!note) throw new TRPCError({ code: 'NOT_FOUND' });

         // Author or editor+; a null author (deleted user) is editor-only
         const isAuthor = note.userId !== null && note.userId === ctx.user.id;
         if (!isAuthor && !isEditor(ctx.user.globalRole))
            throw new TRPCError({ code: 'FORBIDDEN' });

         const [deleted] = await db
            .delete(notes)
            .where(eq(notes.id, input.id))
            .returning({ id: notes.id });
         if (!deleted) throw new TRPCError({ code: 'NOT_FOUND' });

         return { id: deleted.id };
      }),

   listByUser: publicProcedure
      .input(listUserNotesSchema)
      .query(async ({ ctx, input }) => {
         const { userId, search, page, limit, sort } = input;
         const term = search?.trim();
         const pattern = term ? `%${escapeLike(term)}%` : undefined;

         const where = and(
            eq(notes.userId, userId),
            documentVisibility(ctx.user),
            pattern ? ilike(notes.content, pattern) : undefined,
         );

         const order =
            sort === 'newest' ? desc(notes.createdAt) : asc(notes.createdAt);

         const [results, [{ total }]] = await Promise.all([
            db
               .select({
                  id: notes.id,
                  content: notes.content,
                  createdAt: notes.createdAt,
                  updatedAt: notes.updatedAt,
                  pageId: pages.id,
                  pageNumber: pages.pageNumber,
                  pageTitle: pages.title,
                  documentId: documents.id,
                  documentTitle: documents.title,
               })
               .from(notes)
               .innerJoin(pages, eq(pages.id, notes.pageId))
               .innerJoin(documents, eq(documents.id, pages.documentId))
               .where(where)
               .orderBy(order, desc(notes.id))
               .limit(limit)
               .offset((page - 1) * limit),
            db
               .select({ total: count() })
               .from(notes)
               .innerJoin(pages, eq(pages.id, notes.pageId))
               .innerJoin(documents, eq(documents.id, pages.documentId))
               .where(where),
         ]);

         return {
            notes: results,
            totalCount: total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
         };
      }),
});
