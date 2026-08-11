import { z } from 'zod';

export const transcriptionSchema = z.object({
   id: z.string(),
   documentId: z.string(),
   userId: z.string(),
   content: z.string(),
   status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
   rejectedReason: z.string().nullable(),
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

export type Transcription = z.infer<typeof transcriptionSchema>;
export type UpdateTranscriptionInput = z.infer<
   typeof updateTranscriptionSchema
>;
export type SubmitTranscriptionInput = z.infer<
   typeof submitTranscriptionSchema
>;
export type TranscriptionRevision = z.infer<typeof transcriptionRevisionSchema>;
