import { user } from '@/db/schema/auth.js';
import { pages } from '@/db/schema/pages.js';
import { transcriptions } from '@/db/schema/transcriptions.js';
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const versions = pgTable(
   'transcription_versions',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      pageId: text()
         .notNull()
         .references(() => pages.id, { onDelete: 'cascade' }),
      transcriptionId: text().references(() => transcriptions.id, {
         onDelete: 'set null',
      }),
      userId: text().references(() => user.id, { onDelete: 'set null' }),
      approvedBy: text().references(() => user.id, { onDelete: 'set null' }),
      content: text().notNull(),
      isBlank: boolean().notNull().default(false),
      approvedAt: timestamp().notNull().defaultNow(),
   },
   (t) => [
      index('versions_page_id_approved_at_idx').on(t.pageId, t.approvedAt),
   ],
);
