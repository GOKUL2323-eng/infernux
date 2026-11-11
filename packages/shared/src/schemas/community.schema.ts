import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(2).max(500).default('Community space on MOZHI'),
  category: z.string().min(2).max(40).default('general'),
  iconUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  isPrivate: z.boolean().default(false),
});

export const createChannelSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  type: z.enum(['announcement', 'discussion', 'thread', 'resources']).default('discussion'),
  isAnnouncementOnly: z.boolean().default(false),
});

export const createCommunityPostSchema = z.object({
  title: z.string().max(160).optional(),
  content: z.string().min(1).max(4000),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.enum(['image', 'video', 'audio', 'document']),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .max(8)
    .default([]),
  parentPostId: z.string().optional(),
});

export const assignCommunityRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['moderator', 'member']),
});

export const createAudioRoomSchema = z.object({
  title: z.string().min(2).max(120),
  topic: z.string().max(120).optional(),
  communityId: z.string().optional(),
});

export const audioRoomReactionSchema = z.object({
  emoji: z.string().min(1).max(12),
});

export const registerSharedFileSchema = z.object({
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(120),
  fileSizeBytes: z.number().int().positive().max(52_428_800), // 50 MB max single file
  fileUrl: z.string().url(),
  previewUrl: z.string().url().optional(),
  scope: z.enum(['personal', 'community', 'chat']).default('personal'),
  scopeId: z.string().optional(),
  expiresInHours: z.number().min(0.01).max(8760).optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>;
export type AssignCommunityRoleInput = z.infer<typeof assignCommunityRoleSchema>;
export type CreateAudioRoomInput = z.infer<typeof createAudioRoomSchema>;
export type RegisterSharedFileInput = z.infer<typeof registerSharedFileSchema>;
