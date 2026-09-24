import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { transcriptionStatusEnum } from './enums.js';
import { user } from './auth.js';
import { documents } from './documents.js';
import { documentPages } from '@/db/schema/document-pages.js';

export const transcriptions = pgTable(
   'transcriptions',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      pageId: text()
         .notNull()
         .references(() => documentPages.id, { onDelete: 'cascade' }),
      userId: text()
         .notNull()
         .references(() => user.id, { onDelete: 'cascade' }),
      content: text().notNull().default(''),
      status: transcriptionStatusEnum().notNull().default('draft'),
      rejectionReason: text(),
      createdAt: timestamp().notNull().defaultNow(),
      updatedAt: timestamp().notNull().defaultNow(),
   },
   (table) => [
      unique('transcriptions_page_id_user_id_unique').on(
         table.pageId,
         table.userId,
      ),
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
   },
   (table) => [
      index('revisions_transcription_id_idx').on(table.transcriptionId),
   ],
);
