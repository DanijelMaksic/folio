import { z } from 'zod';

export const NOTE_MAX_LENGTH = 1000;

const noteContentSchema = z
   .string()
   .trim()
   .min(1, 'Note content is required')
   .max(
      NOTE_MAX_LENGTH,
      `Note content cannot be longer than ${NOTE_MAX_LENGTH} characters`,
   );

export const listNotesSchema = z.object({
   pageId: z.string(),
   page: z.number().int().min(1).default(1),
   limit: z.number().int().min(1).max(50).default(10),
});

export const createNoteSchema = z.object({
   pageId: z.string(),
   content: noteContentSchema,
});

export const updateNoteSchema = z.object({
   id: z.string(),
   content: noteContentSchema,
});

export const deleteNoteSchema = z.object({ id: z.string() });

// Client-only form schema
export const noteFormSchema = z.object({ content: noteContentSchema });

export type ListNotesInput = z.infer<typeof listNotesSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteFormInput = z.infer<typeof noteFormSchema>;
