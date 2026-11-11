export const SOCKET_EVENTS = {
  // Connection & Auth
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',

  // Presence & Online Status
  USER_ONLINE: 'presence:online',
  USER_OFFLINE: 'presence:offline',
  USER_STATUS_CHANGE: 'presence:status_change',
  HEARTBEAT: 'presence:heartbeat',

  // Chat & Messaging
  JOIN_CONVERSATION: 'chat:join',
  LEAVE_CONVERSATION: 'chat:leave',
  SEND_MESSAGE: 'chat:send_message',
  NEW_MESSAGE: 'chat:new_message',
  MESSAGE_SENT: 'chat:message_sent',
  MESSAGE_EDITED: 'chat:message_edited',
  MESSAGE_DELETED: 'chat:message_deleted',
  MESSAGE_EXPIRED: 'chat:message_expired',
  MESSAGE_CONSUMED: 'chat:message_consumed',
  MEDIA_SAVED: 'chat:media_saved',
  MESSAGE_REACTION: 'chat:reaction',
  MESSAGE_PINNED: 'chat:message_pinned',
  MESSAGE_INTERACTIVE_UPDATED: 'chat:message_interactive_updated',
  MESSAGE_SECRET_REACTION: 'chat:message_secret_reaction',
  DRAFT_UPDATED: 'chat:draft_updated',
  CONVERSATION_PREFS_UPDATED: 'chat:conversation_prefs_updated',
  REMINDER_TRIGGERED: 'chat:reminder_triggered',
  STREAK_UPDATED: 'chat:streak_updated',
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',
  USER_TYPING: 'chat:user_typing',
  MESSAGE_READ: 'chat:read_receipt',
  RECEIPT_UPDATED: 'chat:receipt_updated',

  // Room Events
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_KEY_ROTATED: 'room:key_rotated',
  ROOM_MEMBER_UPDATED: 'room:member_updated',
  ROOM_DESTROYED: 'room:destroyed',
  ROOM_SETTINGS_UPDATED: 'room:settings_updated',
  SCREENSHOT_DETECTED: 'room:screenshot_detected',

  // Voice & Video Calling
  CALL_INITIATE: 'call:initiate',
  CALL_INCOMING: 'call:incoming',
  CALL_ACCEPTED: 'call:accepted',
  CALL_REJECTED: 'call:rejected',
  CALL_ENDED: 'call:ended',
  CALL_BUSY: 'call:busy',
  CALL_PARTICIPANT_JOINED: 'call:participant_joined',
  CALL_PARTICIPANT_LEFT: 'call:participant_left',
  CALL_SIGNAL_OFFER: 'call:signal_offer',
  CALL_SIGNAL_ANSWER: 'call:signal_answer',
  CALL_SIGNAL_ICE: 'call:signal_ice',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Communities & Live Audio Rooms
  AUDIO_ROOM_JOIN: 'audio_room:join',
  AUDIO_ROOM_LEAVE: 'audio_room:leave',
  AUDIO_ROOM_STATE: 'audio_room:state',
  AUDIO_ROOM_REACTION: 'audio_room:reaction',
  COMMUNITY_POST_NEW: 'community:post_new',

  // Together Mode & Capsules
  CAPSULE_UNLOCKED: 'capsule:unlocked',
  TOGETHER_JOIN: 'together:join',
  TOGETHER_LEAVE: 'together:leave',
  TOGETHER_STATE: 'together:state',
} as const;
