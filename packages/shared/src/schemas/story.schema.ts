import { z } from 'zod';

export const createStorySchema = z.object({
  mediaType: z.enum(['image', 'video']),
  mediaUrl: z.string().url('A valid media URL is required'),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(200).optional(),
  audience: z.enum(['all', 'followers', 'close_friends']).default('all'),
  duration: z.number().positive().max(30).default(5),
});

export const replyToStorySchema = z.object({
  message: z.string().min(1).max(500),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type ReplyToStoryInput = z.infer<typeof replyToStorySchema>;

