import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';
import { categories } from '@/db/schema/categories.js';

export const collections = pgTable('collections', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   title: text().notNull(),
   description: text(),
   createdBy: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
   createdAt: timestamp().notNull().defaultNow(),
   categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
   }),
});
