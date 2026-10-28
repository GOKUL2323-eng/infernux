import { z } from 'zod';

export const createPrivateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
  folder: z.string().optional(),
  isPinned: z.boolean().default(false),
  reminderAt: z.string().datetime().optional().nullable(),
  attachments: z.array(z.string().url()).optional(),
});

export const updatePrivateNoteSchema = createPrivateNoteSchema.partial();

export const createSocialNoteSchema = z.object({
  text: z.string().min(1, 'Social note text is required').max(100, 'Social note cannot exceed 100 characters'),
  emoji: z.string().max(8).optional(),
  musicTrackId: z.string().optional(),
  audience: z.enum(['followers', 'close_friends']).default('followers'),
});

export type CreatePrivateNoteInput = z.infer<typeof createPrivateNoteSchema>;
export type UpdatePrivateNoteInput = z.infer<typeof updatePrivateNoteSchema>;
export type CreateSocialNoteInput = z.infer<typeof createSocialNoteSchema>;

