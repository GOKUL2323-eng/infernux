import { v4 as uuidv4 } from 'uuid';
import { Call, ICallDocument } from '../models/Call';
import { User } from '../models/User';
import { generateLiveKitToken } from '../config/livekit';
import { config } from '../config/env';
import {
  InitiateCallInput,
  RespondCallInput,
  EndCallInput,
  CallSession,
  CallType,
  CallStatus,
} from '@infernux/shared';

export class CallService {
  async initiateCall(initiatorId: string, input: InitiateCallInput): Promise<CallSession> {
    const caller = await User.findById(initiatorId);
    if (!caller) throw new Error('Caller user not found');

    let recipient;
    if (input.recipientId) {
      recipient = await User.findById(input.recipientId);
      if (!recipient) throw new Error('Recipient user not found');
    }

    const channelName = `infernux_call_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    const call = new Call({
      callType: input.callType,
      channelName,
      initiatorId,
      recipientId: input.recipientId,
      roomId: input.roomId,
      status: 'ringing',
      startedAt: new Date(),
      participants: [
        {
          userId: initiatorId,
          joinedAt: new Date(),
          isMuted: false,
          isVideoEnabled: input.callType === 'video',
        },
      ],
    });
    await call.save();

    // Generate LiveKit token for the caller
    const livekitToken = await generateLiveKitToken({
      roomName: channelName,
      participantIdentity: initiatorId,
      participantName: caller.displayName || caller.username,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      id: call._id.toString(),
      callType: call.callType,
      channelName: call.channelName,
      initiatorId,
      initiator: {
        id: initiatorId,
        username: caller.username,
        displayName: caller.displayName,
        avatarUrl: caller.avatarUrl,
        isVerified: caller.isVerified,
      },
      recipientId: input.recipientId,
      recipient: recipient
        ? {
            id: recipient._id.toString(),
            username: recipient.username,
            displayName: recipient.displayName,
            avatarUrl: recipient.avatarUrl,
            isVerified: recipient.isVerified,
          }
        : undefined,
      roomId: input.roomId,
      status: call.status,
      startedAt: call.startedAt.toISOString(),
      participants: [
        {
          userId: initiatorId,
          user: {
            id: initiatorId,
            username: caller.username,
            displayName: caller.displayName,
            avatarUrl: caller.avatarUrl,
          },
          isMuted: false,
          isVideoEnabled: input.callType === 'video',
        },
      ],
      livekitToken,
      livekitServerUrl: config.livekit.host,
    };
  }

  async getCallToken(callId: string, userId: string): Promise<{ token: string; serverUrl: string }> {
    const call = await Call.findById(callId);
    if (!call) throw new Error('Call session not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Verify participant authorization
    const isInitiator = call.initiatorId.toString() === userId;
    const isRecipient = call.recipientId && call.recipientId.toString() === userId;
    const isRoomCall = !!call.roomId;

    if (!isInitiator && !isRecipient && !isRoomCall) {
      throw new Error('Access denied: You are not authorized for this call session');
    }

    const token = await generateLiveKitToken({
      roomName: call.channelName,
      participantIdentity: userId,
      participantName: user.displayName || user.username,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token,
      serverUrl: config.livekit.host,
    };
  }

  async respondToCall(callId: string, userId: string, input: RespondCallInput): Promise<CallSession> {
    const call = await Call.findById(callId)
      .populate('initiatorId', 'username displayName avatarUrl isVerified')
      .populate('recipientId', 'username displayName avatarUrl isVerified');

    if (!call) throw new Error('Call session not found');

    if (input.action === 'accept') {
      call.status = 'connected';
      call.connectedAt = new Date();
      call.participants.push({
        userId: new (require('mongoose').Types.ObjectId)(userId),
        joinedAt: new Date(),
        isMuted: false,
        isVideoEnabled: call.callType === 'video',
      });
    } else if (input.action === 'reject') {
      call.status = 'declined';
      call.endedAt = new Date();
    } else if (input.action === 'busy') {
      call.status = 'busy';
      call.endedAt = new Date();
    }

    await call.save();

    const initiator = call.initiatorId as any;
    const recipient = call.recipientId as any;

    return {
      id: call._id.toString(),
      callType: call.callType,
      channelName: call.channelName,
      initiatorId: initiator._id.toString(),
      initiator: {
        id: initiator._id.toString(),
        username: initiator.username,
        displayName: initiator.displayName,
        avatarUrl: initiator.avatarUrl,
      },
      recipientId: recipient ? recipient._id.toString() : undefined,
      recipient: recipient
        ? {
            id: recipient._id.toString(),
            username: recipient.username,
            displayName: recipient.displayName,
            avatarUrl: recipient.avatarUrl,
          }
        : undefined,
      status: call.status,
      startedAt: call.startedAt.toISOString(),
      connectedAt: call.connectedAt?.toISOString(),
      endedAt: call.endedAt?.toISOString(),
      participants: call.participants.map((p) => ({
        userId: p.userId.toString(),
        user: { id: p.userId.toString(), username: '', displayName: '' },
        isMuted: p.isMuted,
        isVideoEnabled: p.isVideoEnabled,
      })),
      livekitServerUrl: config.livekit.host,
    };
  }

  async endCall(callId: string, userId: string, input: EndCallInput): Promise<void> {
    const call = await Call.findById(callId);
    if (!call) return;

    if (call.status === 'ended') return;

    call.status = 'ended';
    call.endedAt = new Date();
    if (call.connectedAt) {
      call.duration = Math.round((call.endedAt.getTime() - call.connectedAt.getTime()) / 1000);
    } else if (input.durationSeconds) {
      call.duration = input.durationSeconds;
    }

    await call.save();
  }

  async getCallHistory(userId: string, limit = 30): Promise<CallSession[]> {
    const calls = await Call.find({
      $or: [{ initiatorId: userId }, { recipientId: userId }, { 'participants.userId': userId }],
    })
      .populate('initiatorId', 'username displayName avatarUrl isVerified')
      .populate('recipientId', 'username displayName avatarUrl isVerified')
      .sort({ startedAt: -1 })
      .limit(limit);

    return calls.map((c) => {
      const initiator = c.initiatorId as any;
      const recipient = c.recipientId as any;
      return {
        id: c._id.toString(),
        callType: c.callType,
        channelName: c.channelName,
        initiatorId: initiator ? initiator._id.toString() : '',
        initiator: {
          id: initiator ? initiator._id.toString() : '',
          username: initiator?.username || '',
          displayName: initiator?.displayName || '',
          avatarUrl: initiator?.avatarUrl,
        },
        recipientId: recipient ? recipient._id.toString() : undefined,
        recipient: recipient
          ? {
              id: recipient._id.toString(),
              username: recipient.username,
              displayName: recipient.displayName,
              avatarUrl: recipient.avatarUrl,
            }
          : undefined,
        roomId: c.roomId?.toString(),
        status: c.status,
        startedAt: c.startedAt.toISOString(),
        connectedAt: c.connectedAt?.toISOString(),
        endedAt: c.endedAt?.toISOString(),
        duration: c.duration,
        participants: [],
      };
    });
  }
}

export const callService = new CallService();
