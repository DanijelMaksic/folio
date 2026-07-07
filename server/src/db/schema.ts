// -- Enums --

import {
   pgEnum,
   pgTable,
   uuid,
   text,
   boolean,
   timestamp,
} from 'drizzle-orm/pg-core';

export const globalRoleEnum = pgEnum('global_role', [
   'viewer',
   'contributor',
   'editor',
   'admin',
]);

// -- Tables --

export const users = pgTable('users', {
   id: uuid().primaryKey().defaultRandom(),
   email: text().notNull().unique(),
   passwordHash: text().notNull(),
   username: text().notNull().unique(),
   globalRole: globalRoleEnum().notNull().default('viewer'),
   emailVerified: boolean().notNull().default(false),
   createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
   updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
   id: uuid().primaryKey().defaultRandom(),
   userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
   tokenHash: text().notNull().unique(),
   family: uuid().notNull(),
   revoked: boolean().notNull().default(false),
   expiresAt: timestamp({ withTimezone: true }).notNull(),
   createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const emailVerifications = pgTable('email_verifications', {
   id: uuid().primaryKey().defaultRandom(),
   userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
   token: text().notNull().unique(), // secure random token sent in the email link
   expiresAt: timestamp({ withTimezone: true }).notNull(),
   usedAt: timestamp({ withTimezone: true }), // null until clicked
   createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
