import { count, desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { isContributor, isEditor } from '@folio/shared';
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

export const notesRouter = router({
   listByPage: publicProcedure
      .input(listNotesSchema)
      .query(async ({ input }) => {
         const { pageId, page, limit } = input;
         const where = eq(notes.pageId, pageId);

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
               })
               .from(notes)
               .leftJoin(user, eq(user.id, notes.userId))
               .where(where)
               .orderBy(desc(notes.createdAt))
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
});
