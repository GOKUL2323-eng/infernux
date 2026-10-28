import { z } from 'zod';

export const createPlaylistSchema = z.object({
  title: z.string().min(1, 'Playlist title is required').max(100),
  description: z.string().max(300).optional(),
  coverUrl: z.string().url().optional(),
  isPublic: z.boolean().default(true),
  trackIds: z.array(z.string()).default([]),
});

export const addTrackToPlaylistSchema = z.object({
  trackId: z.string().min(1),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type AddTrackToPlaylistInput = z.infer<typeof addTrackToPlaylistSchema>;

