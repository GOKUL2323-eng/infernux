import { AccessToken } from 'livekit-server-sdk';
import { config } from './env';
import { logger } from '../utils/logger';

export interface GenerateCallTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  ttlSeconds?: number;
}

export async function generateLiveKitToken(options: GenerateCallTokenOptions): Promise<string> {
  try {
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      ttl: options.ttlSeconds || 3600, // 1 hour by default
    });

    at.addGrant({
      room: options.roomName,
      roomJoin: true,
      canPublish: options.canPublish !== undefined ? options.canPublish : true,
      canSubscribe: options.canSubscribe !== undefined ? options.canSubscribe : true,
      canPublishData: options.canPublishData !== undefined ? options.canPublishData : true,
    });

    return await at.toJwt();
  } catch (error) {
    logger.error('Failed to generate LiveKit call token', 'LiveKit', error);
    throw new Error('Could not generate call token');
  }
}
