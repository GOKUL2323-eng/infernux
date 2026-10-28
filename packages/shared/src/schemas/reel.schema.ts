import { z } from 'zod';

export const createReelSchema = z.object({
  videoUrl: z.string().url('A valid video URL is required'),
  thumbnailUrl: z.string().url('A valid thumbnail URL is required'),
  caption: z.string().max(1000).optional(),
  hashtags: z.array(z.string()).optional(),
  duration: z.number().positive().max(90, 'Reel cannot exceed 90 seconds'),
  audio: z
    .object({
      id: z.string().optional(),
      title: z.string(),
      artist: z.string(),
      audioUrl: z.string().url().optional(),
    })
    .optional(),
});

export const addReelCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});

export type CreateReelInput = z.infer<typeof createReelSchema>;
export type AddReelCommentInput = z.infer<typeof addReelCommentSchema>;
