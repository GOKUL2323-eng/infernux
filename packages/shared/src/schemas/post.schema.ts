import { z } from 'zod';
import { mediaAttachmentSchema } from './chat.schema';

export const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  media: z.array(mediaAttachmentSchema).min(1, 'At least one media item is required'),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  isPrivate: z.boolean().default(false),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  replyToCommentId: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
