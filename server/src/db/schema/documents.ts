import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums.js';
import { user } from './auth.js';
import { collections } from './collections.js';

export const documents = pgTable('documents', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   title: text().notNull(),
   description: text(),
   uploadedBy: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
   r2Key: text(),
   status: documentStatusEnum().notNull().default('ready'),
   collectionId: text().references(() => collections.id, {
      onDelete: 'set null',
   }),
   createdAt: timestamp().notNull().defaultNow(),
   updatedAt: timestamp().notNull().defaultNow(),
});
