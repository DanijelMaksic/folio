import { sql } from 'drizzle-orm';
import {
   pgTable,
   text,
   timestamp,
   uniqueIndex,
   uuid,
} from 'drizzle-orm/pg-core';
import { globalRoleEnum, roleRequestStatusEnum } from './enums.js';
import { user } from './auth.js';

export const roleRequests = pgTable(
   'role_requests',
   {
      id: text()
         .primaryKey()
         .$defaultFn(() => crypto.randomUUID()),
      userId: text()
         .notNull()
         .references(() => user.id, { onDelete: 'cascade' }),
      requestedRole: globalRoleEnum().notNull(),
      message: text().notNull(),
      status: roleRequestStatusEnum().notNull().default('pending'),
      rejectionReason: text(),
      reviewedBy: text().references(() => user.id, { onDelete: 'set null' }),
      reviewedAt: timestamp(),
      createdAt: timestamp().notNull().defaultNow(),
   },
   (t) => [
      // At most one pending request per user, enforced by the database
      uniqueIndex('role_requests_one_pending_per_user')
         .on(t.userId)
         .where(sql`${t.status} = 'pending'`),
   ],
);
