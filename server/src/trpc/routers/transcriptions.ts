import { db } from '@/db/index.js';
import {
   transcriptionRevisions,
   transcriptions,
} from '@/db/schema/transcriptions.js';
import { protectedProcedure, router } from '@/trpc/trpc.js';
import { isContributor } from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import z from 'zod';

export const transcriptionsRouter = router({
   // Fetches the current user's transcription for a given document
   getByDocument: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ ctx, input }) => {
         const result = await db
            .select()
            .from(transcriptions)
            .where(
               and(
                  eq(transcriptions.documentId, input.documentId),
                  eq(transcriptions.userId, ctx.user.id),
               ),
            )
            .limit(1);

         return result[0] ?? null;
      }),

   // Creates a new transcription for a document, or returns the existing one
   create: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can transcribe.',
            });
         }

         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(
               and(
                  eq(transcriptions.documentId, input.documentId),
                  eq(transcriptions.userId, ctx.user.id),
               ),
            )
            .limit(1);

         if (existing) return existing;

         const [created] = await db
            .insert(transcriptions)
            .values({
               documentId: input.documentId,
               userId: ctx.user.id,
            })
            .returning();

         return created;
      }),

   // Saves new content to a transcription and snapshots a revision
   update: protectedProcedure
      .input(z.object({ transcriptionId: z.string(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(eq(transcriptions.id, input.transcriptionId))
            .limit(1);

         // Existence check — throws NOT_FOUND if the transcription doesn't exist
         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

         // Ownership check — throws FORBIDDEN if it belongs to a different user
         if (existing.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

         // Status check — throws BAD_REQUEST if already submitted (locks editing)
         if (existing.status === 'submitted') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Cannot edit a submitted transcription.',
            });
         }

         const [updated] = await db
            .update(transcriptions)
            .set({ content: input.content, updatedAt: new Date() })
            .where(eq(transcriptions.id, input.transcriptionId))
            .returning();

         await db.insert(transcriptionRevisions).values({
            transcriptionId: input.transcriptionId,
            content: input.content,
         });

         return updated;
      }),

   // Marks a transcription as submitted (final)
   submit: protectedProcedure
      .input(z.object({ transcriptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(eq(transcriptions.id, input.transcriptionId))
            .limit(1);

         if (!existing) {
            throw new TRPCError({ code: 'NOT_FOUND' });
         }
         if (existing.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });
         if (existing.status === 'submitted') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Already submitted.',
            });
         }
         if (!existing.content.trim()) {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Cannot submit an empty transcription.',
            });
         }

         const [submitted] = await db
            .update(transcriptions)
            .set({ status: 'submitted', updatedAt: new Date() })
            .where(eq(transcriptions.id, input.transcriptionId))
            .returning();

         return submitted;
      }),

   // Returns the full edit history for a transcription, newest first
   getRevisions: protectedProcedure
      .input(z.object({ transcriptionId: z.string() }))
      .query(async ({ ctx, input }) => {
         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(eq(transcriptions.id, input.transcriptionId))
            .limit(1);

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
         if (existing.userId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN' });
         }

         return db
            .select()
            .from(transcriptionRevisions)
            .where(
               eq(
                  transcriptionRevisions.transcriptionId,
                  input.transcriptionId,
               ),
            )
            .orderBy(desc(transcriptionRevisions.savedAt));
      }),
});
