import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const roleChanges = pgTable('role_changes', {
   id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
   actorId: text().references(() => user.id, { onDelete: 'set null' }),
   targetId: text().references(() => user.id, { onDelete: 'set null' }),
   actorUsername: text().notNull(),
   targetUsername: text().notNull(),
   oldRole: text().notNull(),
   newRole: text().notNull(),
   source: text({ enum: ['direct', 'request'] }).notNull(),
   createdAt: timestamp().defaultNow().notNull(),
});
