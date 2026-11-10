import { db } from '@/db/index.js';
import {
   transcriptionRevisions,
   transcriptions,
} from '@/db/schema/transcriptions.js';
import { pages } from '@/db/schema/pages.js';
import { protectedProcedure, publicProcedure, router } from '@/trpc/trpc.js';
import {
   approveSchema,
   isContributor,
   isEditor,
   listQueueSchema,
   rejectSchema,
   submittedByPageSchema,
   transcriptionContentSchema,
} from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import z from 'zod';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email.js';
import { documents } from '@/db/schema/documents.js';
import { user } from '@/db/schema/auth.js';
import { versions } from '@/db/schema/versions.js';

const OPEN = ['draft', 'submitted', 'rejected'] as const;
const EDITABLE = ['draft', 'rejected'] as const;

function isUniqueViolation(err: unknown) {
   const e = err as { code?: string; cause?: { code?: string } };
   return e?.code === '23505' || e?.cause?.code === '23505';
}

export const transcriptionsRouter = router({
   // Fetches the current user's transcription for a given page
   getByPage: protectedProcedure
      .input(z.object({ pageId: z.string() }))
      .query(async ({ ctx, input }) => {
         const [result] = await db
            .select()
            .from(transcriptions)
            .where(
               and(
                  eq(transcriptions.pageId, input.pageId),
                  eq(transcriptions.userId, ctx.user.id),
                  inArray(transcriptions.status, OPEN),
               ),
            )
            .limit(1);

         return result ?? null;
      }),

   // Creates a new transcription for a page, or returns the existing one
   create: protectedProcedure
      .input(z.object({ pageId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         if (!isContributor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Only contributors and above can transcribe',
            });
         }

         const findOpen = async () => {
            const [row] = await db
               .select()
               .from(transcriptions)
               .where(
                  and(
                     eq(transcriptions.pageId, input.pageId),
                     eq(transcriptions.userId, ctx.user.id),
                     inArray(transcriptions.status, OPEN),
                  ),
               )
               .limit(1);
            return row;
         };

         const existing = await findOpen();
         if (existing) return existing;

         // Prefill from the currently approved text so it works as a correction
         const [approved] = await db
            .select({
               content: transcriptions.content,
               isBlank: transcriptions.isBlank,
            })
            .from(transcriptions)
            .where(
               and(
                  eq(transcriptions.pageId, input.pageId),
                  eq(transcriptions.status, 'approved'),
               ),
            )
            .limit(1);

         try {
            const [created] = await db
               .insert(transcriptions)
               .values({
                  pageId: input.pageId,
                  userId: ctx.user.id,
                  content: approved?.content ?? '',
                  isBlank: approved?.isBlank ?? false,
               })
               .returning();
            return created;
         } catch (err) {
            // Double click or two tabs: return the row that won
            if (isUniqueViolation(err)) {
               const row = await findOpen();
               if (row) return row;
            }
            throw err;
         }
      }),

   // Saves new content to a transcription and snapshots a revision
   update: protectedProcedure
      .input(transcriptionContentSchema)
      .mutation(async ({ ctx, input }) => {
         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(eq(transcriptions.id, input.transcriptionId))
            .limit(1);

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
         if (existing.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

         if (existing.status === 'submitted') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'A submitted transcription cannot be edited',
            });
         }

         const content = input.isBlank ? '' : input.content;

         try {
            return await db.transaction(async (tx) => {
               let targetId = existing.id;

               // Approved rows are immutable: reuse the open row or fork a draft
               if (existing.status === 'approved') {
                  const [open] = await tx
                     .select({
                        id: transcriptions.id,
                        status: transcriptions.status,
                     })
                     .from(transcriptions)
                     .where(
                        and(
                           eq(transcriptions.pageId, existing.pageId),
                           eq(transcriptions.userId, ctx.user.id),
                           inArray(transcriptions.status, OPEN),
                        ),
                     )
                     .limit(1);

                  if (open?.status === 'submitted') {
                     throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'A submitted transcription cannot be edited',
                     });
                  }

                  if (!open) {
                     const [created] = await tx
                        .insert(transcriptions)
                        .values({
                           pageId: existing.pageId,
                           userId: ctx.user.id,
                           content,
                           isBlank: input.isBlank,
                        })
                        .returning();

                     await tx.insert(transcriptionRevisions).values({
                        transcriptionId: created.id,
                        content,
                        isBlank: input.isBlank,
                     });

                     return created;
                  }

                  targetId = open.id;
               }

               const [updated] = await tx
                  .update(transcriptions)
                  .set({
                     content,
                     isBlank: input.isBlank,
                     updatedAt: new Date(),
                  })
                  .where(
                     and(
                        eq(transcriptions.id, targetId),
                        inArray(transcriptions.status, EDITABLE),
                     ),
                  )
                  .returning();

               if (!updated) {
                  throw new TRPCError({
                     code: 'CONFLICT',
                     message: 'This transcription can no longer be edited',
                  });
               }

               await tx.insert(transcriptionRevisions).values({
                  transcriptionId: targetId,
                  content,
                  isBlank: input.isBlank,
               });

               return updated;
            });
         } catch (err) {
            if (isUniqueViolation(err)) {
               throw new TRPCError({
                  code: 'CONFLICT',
                  message:
                     'You already have an open transcription for this page',
               });
            }
            throw err;
         }
      }),

   // Marks a transcription as submitted
   submit: protectedProcedure
      .input(transcriptionContentSchema)
      .mutation(async ({ ctx, input }) => {
         const [existing] = await db
            .select()
            .from(transcriptions)
            .where(eq(transcriptions.id, input.transcriptionId))
            .limit(1);

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
         if (existing.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

         if (existing.status !== 'draft' && existing.status !== 'rejected') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'This transcription cannot be submitted',
            });
         }

         const content = input.isBlank ? '' : input.content;

         if (!content.trim() && !input.isBlank) {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Cannot submit an empty transcription',
            });
         }

         return db.transaction(async (tx) => {
            const [submitted] = await tx
               .update(transcriptions)
               .set({
                  content,
                  isBlank: input.isBlank,
                  status: 'submitted',
                  rejectionReason: null,
                  updatedAt: new Date(),
               })
               .where(
                  and(
                     eq(transcriptions.id, existing.id),
                     inArray(transcriptions.status, ['draft', 'rejected']),
                  ),
               )
               .returning();

            if (!submitted)
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'Already submitted',
               });

            if (
               existing.content !== content ||
               existing.isBlank !== input.isBlank
            ) {
               await tx.insert(transcriptionRevisions).values({
                  transcriptionId: existing.id,
                  content,
                  isBlank: input.isBlank,
               });
            }

            return submitted;
         });
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
         if (existing.userId !== ctx.user.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

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

   listQueue: protectedProcedure
      .input(listQueueSchema)
      .query(async ({ ctx, input }) => {
         if (!isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Editor role required',
            });
         }

         const order =
            input.sort === 'oldest'
               ? [asc(transcriptions.updatedAt), asc(transcriptions.id)]
               : [desc(transcriptions.updatedAt), desc(transcriptions.id)];

         const queue = await db
            .select({
               id: transcriptions.id,
               pageId: transcriptions.pageId,
               userId: user.id,
               pageNumber: pages.pageNumber,
               documentId: documents.id,
               documentTitle: documents.title,
               contributorUsername: user.username,
               status: transcriptions.status,
               updatedAt: transcriptions.updatedAt,
            })
            .from(transcriptions)
            .innerJoin(pages, eq(pages.id, transcriptions.pageId))
            .innerJoin(documents, eq(documents.id, pages.documentId))
            .innerJoin(user, eq(user.id, transcriptions.userId))
            .where(eq(transcriptions.status, 'submitted'))
            .orderBy(...order);

         return queue;
      }),

   approve: protectedProcedure
      .input(approveSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Editor role required',
            });
         }

         const transcription = await db.query.transcriptions.findFirst({
            where: eq(transcriptions.id, input.transcriptionId),
            with: { user: true, page: true },
         });

         if (!transcription || !transcription.user)
            throw new TRPCError({ code: 'NOT_FOUND' });

         if (transcription.userId === ctx.user.id) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Cannot approve your own transcription',
            });
         }

         if (transcription.status !== 'submitted') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Transcription is not submitted',
            });
         }

         const pageId = transcription.pageId;

         await db.transaction(async (tx) => {
            // Previous approval is already stored in versions
            await tx
               .delete(transcriptions)
               .where(
                  and(
                     eq(transcriptions.pageId, pageId),
                     eq(transcriptions.status, 'approved'),
                  ),
               );

            const [approved] = await tx
               .update(transcriptions)
               .set({ status: 'approved', updatedAt: new Date() })
               .where(
                  and(
                     eq(transcriptions.id, transcription.id),
                     eq(transcriptions.status, 'submitted'),
                  ),
               )
               .returning();

            if (!approved)
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'Already reviewed',
               });

            await tx.insert(versions).values({
               pageId,
               transcriptionId: approved.id,
               userId: approved.userId,
               approvedBy: ctx.user.id,
               content: approved.content,
               isBlank: approved.isBlank,
            });
         });

         await sendApprovalEmail({
            to: transcription.user.email,
            username: transcription.user.username,
            documentId: transcription.page.documentId as string,
         });

         return { success: true };
      }),

   reject: protectedProcedure
      .input(rejectSchema)
      .mutation(async ({ ctx, input }) => {
         if (!isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Editor role required',
            });
         }

         const transcription = await db.query.transcriptions.findFirst({
            where: eq(transcriptions.id, input.transcriptionId),
            with: { user: true, page: true },
         });

         if (!transcription) throw new TRPCError({ code: 'NOT_FOUND' });

         if (!transcription.user) throw new TRPCError({ code: 'NOT_FOUND' });

         if (transcription.userId === ctx.user.id) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Cannot reject your own transcription.',
            });
         }

         if (transcription.status !== 'submitted') {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Transcription is not submitted.',
            });
         }

         await db
            .update(transcriptions)
            .set({
               status: 'rejected',
               rejectionReason: input.reason,
               updatedAt: new Date(),
            })
            .where(eq(transcriptions.id, input.transcriptionId));

         await sendRejectionEmail({
            to: transcription.user.email,
            username: transcription.user.username,
            documentId: transcription.page.documentId as string,
            reason: input.reason,
         });

         return { success: true };
      }),

   // Returns submitted transcription for a page (editor view)
   getSubmittedByPageAndUser: protectedProcedure
      .input(submittedByPageSchema)
      .query(async ({ ctx, input }) => {
         if (!isEditor(ctx.user.globalRole)) {
            throw new TRPCError({
               code: 'FORBIDDEN',
               message: 'Editor role required.',
            });
         }

         const transcription = await db.query.transcriptions.findFirst({
            where: and(
               eq(transcriptions.userId, input.userId),
               eq(transcriptions.pageId, input.pageId),
               eq(transcriptions.status, 'submitted'),
            ),
            with: { user: true },
         });

         return transcription ?? null;
      }),

   // Returns approved transcription for a page (public)
   getApprovedByPage: publicProcedure
      .input(z.object({ pageId: z.string() }))
      .query(async ({ ctx, input }) => {
         const [approved] = await db
            .select({
               id: transcriptions.id,
               pageId: transcriptions.pageId,
               userId: transcriptions.userId,
               content: transcriptions.content,
               isBlank: transcriptions.isBlank,
               status: transcriptions.status,
               rejectionReason: transcriptions.rejectionReason,
               createdAt: transcriptions.createdAt,
               updatedAt: transcriptions.updatedAt,
               username: user.username,
               userAvatar: user.image,
            })
            .from(transcriptions)
            .innerJoin(user, eq(user.id, transcriptions.userId))
            .where(
               and(
                  eq(transcriptions.pageId, input.pageId),
                  eq(transcriptions.status, 'approved'),
               ),
            )
            .limit(1);

         return approved ?? null;
      }),
});
