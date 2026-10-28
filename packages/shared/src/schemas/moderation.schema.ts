import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['user', 'post', 'reel', 'story', 'message', 'room', 'social_note']),
  targetId: z.string().min(1),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'copyright', 'impersonation', 'other']),
  description: z.string().max(1000).optional(),
});

export const blockUserSchema = z.object({
  targetUserId: z.string().min(1),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;

