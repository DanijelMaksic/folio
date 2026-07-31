import { relations } from 'drizzle-orm';
import {
   pgTable,
   text,
   timestamp,
   boolean,
   index,
   pgEnum,
   integer,
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

export const userRelations = relations(user, ({ many }) => ({
   sessions: many(session),
   accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
   user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
   user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
