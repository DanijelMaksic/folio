import { user } from '@/db/schema/auth.js';
import { pages } from '@/db/schema/pages.js';
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const notes = pgTable(
   'notes',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      userId: text().references(() => user.id, {
         onDelete: 'set null',
      }),
      pageId: text()
         .notNull()
         .references(() => pages.id, { onDelete: 'cascade' }),
      content: text().notNull(),
      createdAt: timestamp().notNull().defaultNow(),
      updatedAt: timestamp()
         .notNull()
         .defaultNow()
         .$onUpdate(() => new Date()),
   },
   (t) => [index('notes_page_id_created_at_idx').on(t.pageId, t.createdAt)],
);
