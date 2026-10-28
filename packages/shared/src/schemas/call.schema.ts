import { z } from 'zod';

export const initiateCallSchema = z.object({
  recipientId: z.string().optional(),
  roomId: z.string().optional(),
  callType: z.enum(['voice', 'video']),
});

export const respondCallSchema = z.object({
  action: z.enum(['accept', 'reject', 'busy']),
});

export const endCallSchema = z.object({
  reason: z.enum(['normal', 'error', 'canceled', 'declined', 'timeout']).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
});

export type InitiateCallInput = z.infer<typeof initiateCallSchema>;
export type RespondCallInput = z.infer<typeof respondCallSchema>;
export type EndCallInput = z.infer<typeof endCallSchema>;
