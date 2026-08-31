import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const collections = pgTable('collections', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   title: text().notNull(),
   description: text(),
   createdBy: text()
      .notNull()
      .references(() => user.id),
   createdAt: timestamp().notNull().defaultNow(),
});
