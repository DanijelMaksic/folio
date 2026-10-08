import { z } from 'zod';
import { contributionStatsSchema } from './auth.js';

export const dashboardDocumentSchema = z.object({
   id: z.string(),
   title: z.string(),
   status: z.string(),
   pageCount: z.number().int(),
   coverImageUrl: z.string().nullable(),
   updatedAt: z.string(),
});

export const dashboardRejectedSchema = z.object({
   id: z.string(),
   documentId: z.string(),
   documentTitle: z.string(),
   pageNumber: z.number().int(),
   rejectionReason: z.string().nullable(),
   updatedAt: z.string(),
});

export const dashboardOverviewSchema = z.object({
   stats: contributionStatsSchema.nullable(), // null for viewers
   recentDocuments: z.array(dashboardDocumentSchema),
   rejectedTranscriptions: z.array(dashboardRejectedSchema),
   reviewQueueCount: z.number().int().nullable(), // editors+ only
   pendingRoleRequestCount: z.number().int().nullable(), // admins only
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
