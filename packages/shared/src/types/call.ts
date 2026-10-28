import { UserSummary } from './user';

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'busy'
  | 'failed';

export interface CallParticipant {
  userId: string;
  user: UserSummary;
  joinedAt?: string;
  leftAt?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing?: boolean;
}

export interface CallSession {
  id: string;
  callType: CallType;
  channelName: string; // LiveKit room name
  initiatorId: string;
  initiator: UserSummary;
  recipientId?: string; // For 1:1 calls
  recipient?: UserSummary;
  roomId?: string; // For room group calls
  status: CallStatus;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  duration?: number; // seconds
  participants: CallParticipant[];
  livekitToken?: string;
  livekitServerUrl?: string;
}

export interface CallInvitationPayload {
  callId: string;
  callType: CallType;
  caller: UserSummary;
  channelName: string;
  hasVideo: boolean;
  isGroup: boolean;
  roomName?: string;
}
