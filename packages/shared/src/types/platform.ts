export interface AiSummaryResponse {
  conversationId: string;
  summary: string;
  keyTopics: string[];
  extractedTasks: string[];
  extractedDates: string[];
  engine: string;
  disclaimer: string;
}

export interface AiSmartReplyResponse {
  suggestions: string[];
  engine: string;
}

export interface AiContentAssistResponse {
  captions: string[];
  hashtags: string[];
  contentIdeas: string[];
  altText?: string;
  engine: string;
  disclaimer: string;
}

export interface ActiveSessionSummary {
  id: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  isRevoked: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface LoginActivitySummary {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  reason?: string;
  createdAt: string;
}

export interface SecurityOverviewResponse {
  sessions: ActiveSessionSummary[];
  loginActivity: LoginActivitySummary[];
  securityDisclosure: string;
}

export interface ModerationLogSummary {
  id: string;
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  createdAt: string;
}

export interface SuspensionAppealSummary {
  id: string;
  userId: string;
  username: string;
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}
