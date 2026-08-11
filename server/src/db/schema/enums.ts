import { pgEnum } from 'drizzle-orm/pg-core';

export const globalRoleEnum = pgEnum('global_role', [
   'viewer',
   'contributor',
   'editor',
   'admin',
]);

export const documentStatusEnum = pgEnum('document_status', [
   'processing',
   'ready',
   'failed',
]);

export const transcriptionStatusEnum = pgEnum('transcription_status', [
   'draft',
   'submitted',
   'approved',
   'rejected',
]);
