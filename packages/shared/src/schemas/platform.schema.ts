import { z } from 'zod';

export const aiChatSuggestSchema = z.object({
  conversationId: z.string().min(1),
  draftContext: z.string().max(400).optional(),
});

export const aiContentAssistSchema = z.object({
  topic: z.string().min(1).max(300),
  tone: z.enum(['casual', 'professional', 'hype', 'minimal']).default('casual'),
  mediaDescription: z.string().max(400).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'dismissed']),
  actionNote: z.string().max(500).optional(),
  removeTargetContent: z.boolean().default(false),
});

export const suspendUserSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const updateAccountRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin']),
});

export const createAppealSchema = z.object({
  reason: z.string().min(5).max(500),
  details: z.string().max(1000).optional(),
});

export const reviewAppealSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewerNotes: z.string().max(500).optional(),
});

export type AiChatSuggestInput = z.infer<typeof aiChatSuggestSchema>;
export type AiContentAssistInput = z.infer<typeof aiContentAssistSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type UpdateAccountRoleInput = z.infer<typeof updateAccountRoleSchema>;
export type CreateAppealInput = z.infer<typeof createAppealSchema>;
export type ReviewAppealInput = z.infer<typeof reviewAppealSchema>;

