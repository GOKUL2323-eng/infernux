import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
});

export const updatePrivacySchema = z.object({
  isPrivate: z.boolean().optional(),
  allowTagging: z.enum(['everyone', 'followers', 'none']).optional(),
  showActivityStatus: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
  allowDirectMessages: z.enum(['everyone', 'followers', 'none']).optional(),
});

export const updateNotificationsSchema = z.object({
  directMessages: z.boolean().optional(),
  roomMessages: z.boolean().optional(),
  calls: z.boolean().optional(),
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  follows: z.boolean().optional(),
  socialNotes: z.boolean().optional(),
  stories: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type UpdateNotificationsInput = z.infer<typeof updateNotificationsSchema>;
