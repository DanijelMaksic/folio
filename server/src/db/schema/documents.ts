import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums.js';
import { user } from './auth.js';

export const documents = pgTable('documents', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   title: text().notNull(),
   description: text(),
   uploadedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
   version: integer().notNull(),
   cloudinaryPublicId: text().notNull(),
   cloudinaryUrl: text().notNull(),
   status: documentStatusEnum().notNull().default('ready'),
   createdAt: timestamp().notNull().defaultNow(),
   updatedAt: timestamp().notNull().defaultNow(),
});
