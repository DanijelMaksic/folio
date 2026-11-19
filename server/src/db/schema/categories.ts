import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
   id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   name: text('name').notNull().unique(),
   slug: text('slug').notNull().unique(),
   createdAt: timestamp().notNull().defaultNow(),
});
