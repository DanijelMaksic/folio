import { db } from '@/db/index.js';
import { user } from '@/db/schema/auth.js';
import { collections } from '@/db/schema/collections.js';
import { documents } from '@/db/schema/documents.js';
import { notes } from '@/db/schema/notes.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import { publicProcedure, router } from '@/trpc/trpc.js';
import { getPublicProfileSchema } from '@folio/shared';
import { TRPCError } from '@trpc/server';
import { and, count, eq } from 'drizzle-orm';

export const usersRouter = router({
   getPublicProfile: publicProcedure
      .input(getPublicProfileSchema)
      .query(async ({ input }) => {
         const [u] = await db
            .select({
               id: user.id,
               name: user.name,
               username: user.username,
               image: user.image,
               globalRole: user.globalRole,
               createdAt: user.createdAt,
            })
            .from(user)
            .where(eq(user.username, input.username));
         if (!u) throw new TRPCError({ code: 'NOT_FOUND' });

         // fetch data for stats
         const [[docs], [cols], [approved], [totalNotes]] = await Promise.all([
            db
               .select({ n: count() })
               .from(documents)
               .where(
                  and(
                     eq(documents.uploadedBy, u.id),
                     eq(documents.status, 'ready'),
                  ),
               ),
            db
               .select({ n: count() })
               .from(collections)
               .where(eq(collections.createdBy, u.id)),
            db
               .select({ n: count() })
               .from(transcriptions)
               .where(
                  and(
                     eq(transcriptions.userId, u.id),
                     eq(transcriptions.status, 'approved'),
                  ),
               ),
            db.select({ n: count() }).from(notes).where(eq(notes.userId, u.id)),
         ]);

         return {
            ...u,
            stats: {
               documents: docs.n,
               collections: cols.n,
               approvedTranscriptions: approved.n,
               notes: totalNotes.n,
            },
         };
      }),
});
