import { relations } from 'drizzle-orm';
import { user, session, account } from './auth.js';
import { documents } from './documents.js';
import { transcriptions, transcriptionRevisions } from './transcriptions.js';

export const userRelations = relations(user, ({ many }) => ({
   sessions: many(session),
   accounts: many(account),
   transcriptions: many(transcriptions),
}));

export const sessionRelations = relations(session, ({ one }) => ({
   user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
   user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
   uploadedBy: one(user, {
      fields: [documents.uploadedBy],
      references: [user.id],
   }),
   transcriptions: many(transcriptions),
}));

export const transcriptionRelations = relations(
   transcriptions,
   ({ one, many }) => ({
      document: one(documents, {
         fields: [transcriptions.documentId],
         references: [documents.id],
      }),
      user: one(user, {
         fields: [transcriptions.userId],
         references: [user.id],
      }),
      revisions: many(transcriptionRevisions),
   }),
);

export const transcriptionRevisionRelations = relations(
   transcriptionRevisions,
   ({ one }) => ({
      transcription: one(transcriptions, {
         fields: [transcriptionRevisions.transcriptionId],
         references: [transcriptions.id],
      }),
   }),
);
