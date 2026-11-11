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
  trimStartSec: z.number().min(0).optional(),
  trimEndSec: z.number().min(0).optional(),
  playbackSpeed: z.number().min(0.25).max(3).optional(),
  clips: z
    .array(
      z.object({
        videoUrl: z.string().url(),
        startSec: z.number().min(0),
        endSec: z.number().min(0),
        speed: z.number().min(0.25).max(3).optional(),
      })
    )
    .max(10)
    .optional(),
  voiceoverUrl: z.string().url().optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  voiceoverVolume: z.number().min(0).max(1).optional(),
  textOverlays: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1).max(120),
        color: z.string().optional(),
        y: z.number().optional(),
      })
    )
    .max(10)
    .optional(),
  coverTimeSec: z.number().min(0).optional(),
  status: z.enum(['draft', 'scheduled', 'published']).default('published'),
  scheduledFor: z.string().optional(),
  collaboratorIds: z.array(z.string()).max(10).optional(),
});

export const addReelCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});

export type CreateReelInput = z.infer<typeof createReelSchema>;
export type AddReelCommentInput = z.infer<typeof addReelCommentSchema>;

