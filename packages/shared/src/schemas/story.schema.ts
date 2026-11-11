import { z } from 'zod';

export const storyStickerSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['question_box', 'poll', 'music', 'countdown']),
  prompt: z.string().max(200).optional(),
  allowAnonymous: z.boolean().optional(),
  question: z.string().max(200).optional(),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(120),
        voterIds: z.array(z.string()).default([]),
      })
    )
    .max(6)
    .optional(),
  musicTitle: z.string().max(120).optional(),
  musicArtist: z.string().max(120).optional(),
  audioUrl: z.string().url().optional(),
  countdownTitle: z.string().max(120).optional(),
  countdownTargetDate: z.string().optional(),
});

export const createStorySchema = z.object({
  mediaType: z.enum(['image', 'video']),
  mediaUrl: z.string().url('A valid media URL is required'),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(200).optional(),
  audience: z.enum(['all', 'followers', 'close_friends', 'custom']).default('all'),
  allowedUserIds: z.array(z.string()).optional(),
  collaboratorIds: z.array(z.string()).optional(),
  stickers: z.array(storyStickerSchema).max(6).optional(),
  duration: z.number().positive().max(30).default(5),
});

export const interactStoryStickerSchema = z.object({
  optionId: z.string().optional(),
  answerText: z.string().min(1).max(300).optional(),
  isAnonymous: z.boolean().default(true),
});

export const storyReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const createStoryHighlightSchema = z.object({
  title: z.string().min(1).max(60),
  coverUrl: z.string().url().optional(),
  storyIds: z.array(z.string().min(1)).min(1).max(30),
});

export const replyToStorySchema = z.object({
  message: z.string().min(1).max(500),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type ReplyToStoryInput = z.infer<typeof replyToStorySchema>;
export type InteractStoryStickerInput = z.infer<typeof interactStoryStickerSchema>;
export type CreateStoryHighlightInput = z.infer<typeof createStoryHighlightSchema>;

