import {
   pgTable,
   text,
   timestamp,
   index,
   boolean,
   uniqueIndex,
} from 'drizzle-orm/pg-core';
import { transcriptionStatusEnum } from './enums.js';
import { user } from './auth.js';
import { pages } from '@/db/schema/pages.js';
import { sql } from 'drizzle-orm';

export const transcriptions = pgTable(
   'transcriptions',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      pageId: text()
         .notNull()
         .references(() => pages.id, { onDelete: 'cascade' }),
      userId: text().references(() => user.id, { onDelete: 'set null' }),
      content: text().notNull().default(''),
      isBlank: boolean().notNull().default(false),
      status: transcriptionStatusEnum().notNull().default('draft'),
      rejectionReason: text(),
      createdAt: timestamp().notNull().defaultNow(),
      updatedAt: timestamp().notNull().defaultNow(),
   },
   (table) => [
      uniqueIndex('transcriptions_one_open_per_user_page')
         .on(table.pageId, table.userId)
         .where(sql`${table.status} in ('draft', 'submitted', 'rejected')`),
      uniqueIndex('transcriptions_one_approved_per_page')
         .on(table.pageId)
         .where(sql`${table.status} = 'approved'`),
      index('transcriptions_page_id_idx').on(table.pageId),
      index('transcriptions_user_id_idx').on(table.userId),
   ],
);

export const transcriptionRevisions = pgTable(
   'transcription_revisions',
   {
      id: text()
         .notNull()
         .$defaultFn(() => crypto.randomUUID()),
      transcriptionId: text()
         .notNull()
         .references(() => transcriptions.id, { onDelete: 'cascade' }),
      content: text().notNull(),
      savedAt: timestamp().notNull().defaultNow(),
      isBlank: boolean().notNull().default(false),
   },
   (table) => [
      index('revisions_transcription_id_idx').on(table.transcriptionId),
   ],
);
