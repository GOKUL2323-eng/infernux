import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters').max(60, 'Room name cannot exceed 60 characters'),
  description: z.string().max(250).optional(),
  avatarUrl: z.string().url().optional(),
  isPrivate: z.boolean().optional().default(true),
  keyExpiresHours: z.number().int().positive().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional().default(false),
  disappearingMode: z.enum(['off', 'after_view', '24h', '7d']).optional().default('24h'),
  mediaSavePolicy: z.enum(['view_only', 'allow_save', 'view_once', 'keep_in_chat']).optional().default('allow_save'),
});

export const updateRoomPrivacySettingsSchema = z.object({
  disappearingMode: z.enum(['off', 'after_view', '24h', '7d']).optional(),
  mediaSavePolicy: z.enum(['view_only', 'allow_save', 'view_once', 'keep_in_chat']).optional(),
});

export const joinRoomByKeySchema = z.object({
  secretKey: z.string().min(8, 'Invalid invitation key format').trim(),
});

export const rotateRoomKeySchema = z.object({
  expiresHours: z.number().int().positive().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'moderator', 'member']),
  isMuted: z.boolean().optional(),
});

export type CreateRoomInput = z.input<typeof createRoomSchema>;
export type JoinRoomByKeyInput = z.infer<typeof joinRoomByKeySchema>;
export type RotateRoomKeyInput = z.infer<typeof rotateRoomKeySchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type UpdateRoomPrivacySettingsInput = z.infer<typeof updateRoomPrivacySettingsSchema>;
