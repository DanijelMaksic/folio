import { z } from 'zod';
import type { User } from './auth.js';

export const transcriptionSchema = z.object({
   id: z.string(),
   documentId: z.string(),
   userId: z.string(),
   content: z.string(),
   status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
   rejectionReason: z.string().nullable(),
   createdAt: z.date(),
   updatedAt: z.date(),
});

export const updateTranscriptionSchema = z.object({
   id: z.string(),
   content: z.string().min(1, 'Transcription content cannot be empty'),
});

export const submitTranscriptionSchema = z.object({
   id: z.string(),
});

export const transcriptionRevisionSchema = z.object({
   id: z.string(),
   transcriptionId: z.string(),
   content: z.string(),
   savedAt: z.date(),
});

// Use this schema only if you want to combine approve and reject into one modal on Front-End
// export const reviewTranscriptionSchema = z
//    .object({
//       id: z.string(),
//       decision: z.enum(['approved', 'rejected']),
//       reason: z.string().min(1, 'Rejection reason is required'),
//    })
//    .refine(
//       (val) =>
//          val.decision !== 'rejected' ||
//          (val.reason !== undefined && val.reason.length > 0),
//       {
//          message: 'Rejection reason is required when rejecting',
//          path: ['reason'],
//       },
//    );

export const approveSchema = z.object({
   transcriptionId: z.string(),
});

export const rejectSchema = z.object({
   transcriptionId: z.string(),
   reason: z
      .string()
      .min(1, 'Reason is required.')
      .max(1000, 'Reason cannot be longer than 1000 characters'),
});

export const queueItemSchema = z.object({
   id: z.string(),
   documentId: z.string(),
   documentTitle: z.string(),
   contributorUsername: z.string(),
   status: z.enum(['submitted']),
   updatedAt: z.date(),
});

export const queueResponseSchema = z.array(queueItemSchema);

export type Transcription = z.infer<typeof transcriptionSchema>;
export type SubmittedTranscription = Transcription & { user: User };
export type UpdateTranscriptionInput = z.infer<
   typeof updateTranscriptionSchema
>;
export type SubmitTranscriptionInput = z.infer<
   typeof submitTranscriptionSchema
>;
export type TranscriptionRevision = z.infer<typeof transcriptionRevisionSchema>;
// export type ReviewTranscriptionInput = z.infer<
//    typeof reviewTranscriptionSchema
// >;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type QueueResponse = z.infer<typeof queueResponseSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
