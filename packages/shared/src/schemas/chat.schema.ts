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

export const interactivePollOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(200),
  voterIds: z.array(z.string()).default([]),
  isCorrect: z.boolean().optional(),
});

export const interactiveChecklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(200),
  completed: z.boolean().default(false),
  completedBy: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const interactiveMessageDataSchema = z.object({
  kind: z.enum(['poll', 'quiz', 'voting_card', 'event', 'checklist', 'location', 'contact', 'task']),
  question: z.string().max(300).optional(),
  allowMultiple: z.boolean().optional(),
  explanation: z.string().max(400).optional(),
  options: z.array(interactivePollOptionSchema).max(12).optional(),
  checklistItems: z.array(interactiveChecklistItemSchema).max(30).optional(),
  event: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      startsAt: z.string().min(1),
      location: z.string().max(200).optional(),
      rsvpGoingIds: z.array(z.string()).default([]),
      rsvpMaybeIds: z.array(z.string()).default([]),
      rsvpDeclinedIds: z.array(z.string()).default([]),
    })
    .optional(),
  location: z
    .object({
      label: z.string().min(1).max(150),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().max(300).optional(),
      liveUntil: z.string().optional(),
    })
    .optional(),
  contact: z
    .object({
      userId: z.string().optional(),
      displayName: z.string().min(1).max(120),
      username: z.string().max(60).optional(),
      phone: z.string().max(30).optional(),
    })
    .optional(),
  task: z
    .object({
      title: z.string().min(1).max(200),
      assigneeId: z.string().min(1),
      assigneeDisplayName: z.string().optional(),
      dueAt: z.string().optional(),
      status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
    })
    .optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().default(''),
  contentType: z
    .enum([
      'text',
      'image',
      'video',
      'audio',
      'document',
      'shared_post',
      'shared_reel',
      'music_reference',
      'call_event',
      'poll',
      'quiz',
      'voting_card',
      'event',
      'checklist',
      'location',
      'contact',
      'task',
    ])
    .default('text'),
  attachments: z.array(mediaAttachmentSchema).optional(),
  replyToId: z.string().optional(),
  clientTempId: z.string().optional(),
  viewOnce: z.boolean().optional(),
  disappearingMode: z.enum(['off', 'after_view', '24h', '7d']).optional(),
  scheduledFor: z.string().optional(),
  interactiveData: interactiveMessageDataSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const saveMediaSchema = z.object({
  mediaUrl: z.string().url(),
});

export const consumeViewOnceSchema = z.object({
  messageId: z.string().min(1),
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

export const forwardMessageSchema = z.object({
  targetConversationIds: z.array(z.string().min(1)).min(1).max(20),
});

export const pinMessageSchema = z.object({
  pinned: z.boolean(),
});

export const interactMessageSchema = z.object({
  action: z.enum(['vote', 'toggle_checklist', 'rsvp', 'update_task']),
  optionId: z.string().optional(),
  itemId: z.string().optional(),
  rsvpStatus: z.enum(['going', 'maybe', 'declined']).optional(),
  taskStatus: z.enum(['todo', 'in_progress', 'done']).optional(),
});

export const createReminderSchema = z.object({
  remindAt: z.string().min(1),
  note: z.string().max(250).optional(),
});

export const savePersonalMessageSchema = z.object({
  collectionName: z.string().min(1).max(60).default('Saved'),
  note: z.string().max(250).optional(),
  isImportant: z.boolean().default(false),
});

export const syncDraftSchema = z.object({
  content: z.string().max(4000),
});

export const translateMessageSchema = z.object({
  targetLang: z.string().min(2).max(10).default('en'),
});

export const createChatFolderSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
  conversationIds: z.array(z.string()).default([]),
});

export const updateConversationPrefsSchema = z.object({
  isPriority: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  folderIds: z.array(z.string()).optional(),
});

export const updateStreakSettingsSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  privacyHidden: z.boolean().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SaveMediaInput = z.infer<typeof saveMediaSchema>;
export type ConsumeViewOnceInput = z.infer<typeof consumeViewOnceSchema>;
export type ForwardMessageInput = z.infer<typeof forwardMessageSchema>;
export type PinMessageInput = z.infer<typeof pinMessageSchema>;
export type InteractMessageInput = z.infer<typeof interactMessageSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type SavePersonalMessageInput = z.infer<typeof savePersonalMessageSchema>;
export type SyncDraftInput = z.infer<typeof syncDraftSchema>;
export type TranslateMessageInput = z.infer<typeof translateMessageSchema>;
export type CreateChatFolderInput = z.infer<typeof createChatFolderSchema>;
export type UpdateConversationPrefsInput = z.infer<typeof updateConversationPrefsSchema>;
export type UpdateStreakSettingsInput = z.infer<typeof updateStreakSettingsSchema>;

