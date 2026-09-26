import { relations } from 'drizzle-orm';
import { pages } from '@/db/schema/pages.js';
import {
   transcriptionRevisions,
   transcriptions,
} from '@/db/schema/transcriptions.js';
import { documents } from '@/db/schema/documents.js';
import { account, session, user } from '@/db/schema/auth.js';

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
   documentPages: many(pages),
}));

export const documentPageRelations = relations(pages, ({ one, many }) => ({
   document: one(documents, {
      fields: [pages.documentId],
      references: [documents.id],
   }),
   transcriptions: many(transcriptions),
}));

export const transcriptionRelations = relations(
   transcriptions,
   ({ one, many }) => ({
      page: one(pages, {
         fields: [transcriptions.pageId],
         references: [pages.id],
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
