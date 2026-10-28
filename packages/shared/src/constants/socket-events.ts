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
  MESSAGE_REACTION: 'chat:reaction',
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
} as const;
