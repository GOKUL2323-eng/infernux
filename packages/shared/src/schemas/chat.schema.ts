import { z } from 'zod';

export const mediaAttachmentSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  type: z.enum(['image', 'video', 'audio', 'document']),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().default(''),
  contentType: z.enum([
    'text',
    'image',
    'video',
    'audio',
    'document',
    'shared_post',
    'shared_reel',
    'music_reference',
    'call_event',
  ]).default('text'),
  attachments: z.array(mediaAttachmentSchema).optional(),
  replyToId: z.string().optional(),
  clientTempId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group', 'room']),
  recipientId: z.string().optional(), // For 1:1 direct message
  participantIds: z.array(z.string()).optional(), // For group
  title: z.string().optional(),
  roomId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

