import { z } from 'zod';

export const snapOverlayItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'sticker']),
  content: z.string().min(1).max(160),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  color: z.string().max(20).optional(),
  scale: z.number().min(0.4).max(3).optional(),
});

export const createSnapMomentSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1).max(30),
  mediaType: z.enum(['image', 'video']),
  mediaUrl: z.string().url('Valid media URL required'),
  caption: z.string().max(240).optional(),
  filter: z.enum(['normal', 'neon', 'noir', 'vivid', 'vaporwave', 'warm']).default('normal'),
  overlays: z.array(snapOverlayItemSchema).max(15).default([]),
  disappearingSeconds: z.number().int().min(3).max(86400).default(10),
  allowReplay: z.boolean().default(true),
});

export type CreateSnapMomentInput = z.infer<typeof createSnapMomentSchema>;

