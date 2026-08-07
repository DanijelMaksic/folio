import { relations } from 'drizzle-orm';
import {
   pgTable,
   text,
   timestamp,
   boolean,
   index,
   pgEnum,
   integer,
   unique,
} from 'drizzle-orm/pg-core';

export const globalRoleEnum = pgEnum('global_role', [
   'viewer',
   'contributor',
   'editor',
   'admin',
]);

export const documentStatusEnum = pgEnum('document_status', [
   'processing',
   'ready',
   'failed',
]);

export const transcriptionStatusEnum = pgEnum('transcription_status', [
   'draft',
   'submitted',
   'approved',
   'rejected',
]);

export const user = pgTable('user', {
   id: text().primaryKey(),
   name: text().notNull(),
   email: text().notNull().unique(),
   emailVerified: boolean().default(false).notNull(),
   image: text(),
   createdAt: timestamp().defaultNow().notNull(),
   updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
   username: text().notNull().unique(),
   globalRole: globalRoleEnum().notNull().default('viewer'),
   twoFactorEnabled: boolean().default(false),
});

export const documents = pgTable('documents', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   title: text().notNull(),
   description: text(),
   uploadedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
   version: text().notNull(),
   cloudinaryPublicId: text().notNull(),
   cloudinaryUrl: text().notNull(),
   status: documentStatusEnum().notNull().default('ready'),
   createdAt: timestamp().notNull().defaultNow(),
   updatedAt: timestamp().notNull().defaultNow(),
});

export const transcriptions = pgTable(
   'transcriptions',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      documentId: text()
         .notNull()
         .references(() => documents.id, { onDelete: 'cascade' }),
      userId: text()
         .notNull()
         .references(() => user.id, { onDelete: 'cascade' }),
      content: text().notNull().default(''),
      status: transcriptionStatusEnum().notNull().default('draft'),
      createdAt: timestamp().notNull().defaultNow(),
      updatedAt: timestamp().notNull().defaultNow(),
   },
   (table) => [
      index('transcriptions_document_id_idx').on(table.documentId),
      index('transcriptions_user_id_idx').on(table.userId),
      unique('transcriptions_document_user_unique').on(
         table.documentId,
         table.userId,
      ),
   ],
);

export const transcriptionRevisions = pgTable(
   'transcription_revisions',
   {
      id: text()
         .notNull()
         .$defaultFn(() => crypto.randomUUID()),
      transcriptionId: text()
         .notNull()
         .references(() => transcriptions.id, { onDelete: 'cascade' }),
      content: text().notNull(),
      savedAt: timestamp().notNull().defaultNow(),
   },
   (table) => [
      index('revisions_transcription_id_idx').on(table.transcriptionId),
   ],
);

export const session = pgTable(
   'session',
   {
      id: text().primaryKey(),
      expiresAt: timestamp().notNull(),
      token: text('token').notNull().unique(),
      createdAt: timestamp().defaultNow().notNull(),
      updatedAt: timestamp()
         .$onUpdate(() => new Date())
         .notNull(),
      ipAddress: text(),
      userAgent: text(),
      userId: text()
         .notNull()
         .references(() => user.id, { onDelete: 'cascade' }),
   },
   (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
   'account',
   {
      id: text().primaryKey(),
      accountId: text().notNull(),
      providerId: text().notNull(),
      userId: text()
         .notNull()
         .references(() => user.id, { onDelete: 'cascade' }),
      accessToken: text(),
      refreshToken: text(),
      idToken: text(),
      accessTokenExpiresAt: timestamp(),
      refreshTokenExpiresAt: timestamp(),
      scope: text(),
      password: text(),
      createdAt: timestamp().defaultNow().notNull(),
      updatedAt: timestamp()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
   'verification',
   {
      id: text().primaryKey(),
      identifier: text().notNull(),
      value: text().notNull(),
      expiresAt: timestamp().notNull(),
      createdAt: timestamp().defaultNow().notNull(),
      updatedAt: timestamp()
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const twoFactor = pgTable('two_factor', {
   id: text().primaryKey(),
   userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
   secret: text().notNull(),
   backupCodes: text().notNull(),
   verified: boolean().default(false),
   failedVerificationCount: integer().notNull().default(0),
   lockedUntil: timestamp(),
});

// A query-time metadata layer that tells Drizzle's "with:" API how to stitch related rows together:
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
   // A document was uploaded by exactly one user
   uploadedBy: one(user, {
      fields: [documents.uploadedBy],
      references: [user.id],
   }),
   // A document can have many transcriptions (one per user who transcribes it)
   transcriptions: many(transcriptions),
}));

export const transcriptionRelations = relations(
   transcriptions,
   ({ one, many }) => ({
      // A transcription belongs to exactly one document
      document: one(documents, {
         fields: [transcriptions.documentId],
         references: [documents.id],
      }),
      // A transcription belongs to exactly one user
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
      // A revision belongs to exactly one transcription.
      transcription: one(transcriptions, {
         fields: [transcriptionRevisions.transcriptionId],
         references: [transcriptions.id],
      }),
   }),
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
export type TranscriptionRevision = typeof transcriptionRevisions.$inferSelect;
