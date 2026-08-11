import {
   pgTable,
   text,
   timestamp,
   boolean,
   index,
   integer,
} from 'drizzle-orm/pg-core';
import { globalRoleEnum } from './enums.js';

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
