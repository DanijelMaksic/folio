import { documents } from '@/db/schema/documents.js';
import { integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const documentPages = pgTable(
   'document_pages',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      documentId: text().references(() => documents.id, {
         onDelete: 'cascade',
      }),
      pageNumber: integer().notNull(),
      imageUrl: text().notNull(),
      cloudinaryPublicId: text().notNull(),
      createdAt: timestamp().notNull().defaultNow(),
   },
   (table) => [
      unique('document_pages_document_id_page_number_unique').on(
         table.documentId,
         table.pageNumber,
      ),
   ],
);
