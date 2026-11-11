import { z } from 'zod';

export const createMemoryCapsuleSchema = z.object({
  recipientIds: z.array(z.string()).max(20).default([]),
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).max(6).default([]),
  unlockAt: z.string().min(1),
});

export const createMoodEntrySchema = z.object({
  mood: z.enum(['happy', 'calm', 'hyped', 'focused', 'melancholy', 'grateful', 'tired', 'inspired']),
  emoji: z.string().min(1).max(12),
  note: z.string().max(240).optional(),
  colorHex: z.string().max(16).default('#A020F0'),
  isPublic: z.boolean().default(true),
});

export const createTogetherSessionSchema = z.object({
  title: z.string().min(2).max(120),
  sessionType: z.enum(['watch', 'listen', 'study']).default('watch'),
  mediaUrl: z.string().url().optional(),
  trackTitle: z.string().max(120).optional(),
});

export const syncTogetherStateSchema = z.object({
  playbackPositionSec: z.number().min(0),
  isPlaying: z.boolean(),
  mediaUrl: z.string().url().optional(),
  trackTitle: z.string().max(120).optional(),
});

export const updateSmartPresenceSchema = z.object({
  statusMode: z.enum(['online', 'focus', 'gaming', 'listening', 'away', 'busy', 'dnd']),
  customStatusText: z.string().max(80).optional(),
  focusDurationMinutes: z.number().int().min(0).max(1440).optional(),
});

export const updateInteractiveProfileSchema = z.object({
  profileThemeAccent: z.string().max(20).optional(),
  featuredSongTitle: z.string().max(120).optional(),
  profilePrompts: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().min(1).max(140),
        answer: z.string().min(1).max(300),
      })
    )
    .max(5)
    .optional(),
});

export const signGuestbookSchema = z.object({
  emoji: z.string().min(1).max(12).default('✨'),
  note: z.string().min(1).max(160),
});

export type CreateMemoryCapsuleInput = z.infer<typeof createMemoryCapsuleSchema>;
export type CreateMoodEntryInput = z.infer<typeof createMoodEntrySchema>;
export type CreateTogetherSessionInput = z.infer<typeof createTogetherSessionSchema>;
export type SyncTogetherStateInput = z.infer<typeof syncTogetherStateSchema>;
export type UpdateSmartPresenceInput = z.infer<typeof updateSmartPresenceSchema>;
export type UpdateInteractiveProfileInput = z.infer<typeof updateInteractiveProfileSchema>;
export type SignGuestbookInput = z.infer<typeof signGuestbookSchema>;

