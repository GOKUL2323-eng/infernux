import mongoose from 'mongoose';
import { AudioRoom, IAudioRoomDocument } from '../models/AudioRoom';
import { User } from '../models/User';
import { AudioRoomSummary, CreateAudioRoomInput, SOCKET_EVENTS } from '@infernux/shared';
import { getIO } from '../sockets';

export class AudioRoomService {
  private formatRoom(doc: IAudioRoomDocument): AudioRoomSummary {
    const host = doc.hostId as any;
    const hostId = host?._id?.toString() || host?.toString() || '';
    return {
      id: doc._id.toString(),
      title: doc.title,
      topic: doc.topic,
      communityId: doc.communityId?.toString(),
      hostId,
      host: {
        id: hostId,
        username: host?.username || '',
        displayName: host?.displayName || '',
        avatarUrl: host?.avatarUrl,
        isVerified: host?.isVerified,
      },
      status: doc.status,
      participants: doc.participants.map((p) => ({
        userId: p.userId.toString(),
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        role: p.role,
        isMuted: p.isMuted,
        handRaised: p.handRaised,
        lastReaction: p.lastReaction,
        joinedAt: p.joinedAt.toISOString(),
      })),
      speakerRequests: doc.speakerRequests.map((id) => id.toString()),
      createdAt: doc.createdAt.toISOString(),
      endedAt: doc.endedAt?.toISOString(),
    };
  }

  private emitState(summary: AudioRoomSummary): void {
    const io = getIO();
    if (io) {
      io.to(`audio_room:${summary.id}`).emit(SOCKET_EVENTS.AUDIO_ROOM_STATE, summary);
    }
  }

  async createRoom(hostId: string, input: CreateAudioRoomInput): Promise<AudioRoomSummary> {
    const hostUser = await User.findById(hostId).select('username displayName avatarUrl');
    if (!hostUser) throw new Error('User not found');

    const room = new AudioRoom({
      title: input.title,
      topic: input.topic,
      communityId: input.communityId ? new mongoose.Types.ObjectId(input.communityId) : undefined,
      hostId,
      status: 'live',
      participants: [
        {
          userId: hostUser._id,
          username: hostUser.username,
          displayName: hostUser.displayName,
          avatarUrl: hostUser.avatarUrl,
          role: 'host',
          isMuted: false,
          handRaised: false,
          joinedAt: new Date(),
        },
      ],
    });
    await room.save();
    await room.populate('hostId', 'username displayName avatarUrl isVerified');
    return this.formatRoom(room);
  }

  async listLiveRooms(communityId?: string): Promise<AudioRoomSummary[]> {
    const filter: any = { status: 'live' };
    if (communityId) filter.communityId = communityId;

    const docs = await AudioRoom.find(filter)
      .populate('hostId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(40);
    return docs.map((d) => this.formatRoom(d));
  }

  async getRoom(roomId: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');
    return this.formatRoom(room);
  }

  async joinRoom(roomId: string, userId: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');
    if (room.status !== 'live') throw new Error('Audio room has ended');

    const already = room.participants.some((p) => p.userId.toString() === userId);
    if (!already) {
      const userDoc = await User.findById(userId).select('username displayName avatarUrl');
      if (!userDoc) throw new Error('User not found');

      const hostId = (room.hostId as any)?._id?.toString() || room.hostId.toString();
      room.participants.push({
        userId: userDoc._id,
        username: userDoc.username,
        displayName: userDoc.displayName,
        avatarUrl: userDoc.avatarUrl,
        role: userId === hostId ? 'host' : 'listener',
        isMuted: userId !== hostId,
        handRaised: false,
        joinedAt: new Date(),
      });
      await room.save();
    }

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async leaveRoom(roomId: string, userId: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');

    room.participants = room.participants.filter((p) => p.userId.toString() !== userId);
    room.speakerRequests = room.speakerRequests.filter((id) => id.toString() !== userId);
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async toggleHandRaise(roomId: string, userId: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');

    const participant = room.participants.find((p) => p.userId.toString() === userId);
    if (!participant) throw new Error('Join the audio room first');

    participant.handRaised = !participant.handRaised;
    if (participant.handRaised) {
      if (!room.speakerRequests.some((id) => id.toString() === userId)) {
        room.speakerRequests.push(new mongoose.Types.ObjectId(userId));
      }
    } else {
      room.speakerRequests = room.speakerRequests.filter((id) => id.toString() !== userId);
    }
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async approveSpeaker(
    roomId: string,
    hostId: string,
    targetUserId: string
  ): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');
    const actualHostId = (room.hostId as any)?._id?.toString() || room.hostId.toString();
    if (actualHostId !== hostId) {
      throw new Error('Only the room host can promote speakers');
    }

    const target = room.participants.find((p) => p.userId.toString() === targetUserId);
    if (!target) throw new Error('Participant not found in room');

    target.role = 'speaker';
    target.handRaised = false;
    target.isMuted = false;
    room.speakerRequests = room.speakerRequests.filter((id) => id.toString() !== targetUserId);
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async revokeSpeaker(
    roomId: string,
    hostId: string,
    targetUserId: string
  ): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');
    const actualHostId = (room.hostId as any)?._id?.toString() || room.hostId.toString();
    if (actualHostId !== hostId) {
      throw new Error('Only the room host can move speakers back to listeners');
    }

    const target = room.participants.find((p) => p.userId.toString() === targetUserId);
    if (!target) throw new Error('Participant not found in room');

    target.role = 'listener';
    target.isMuted = true;
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async toggleMute(
    roomId: string,
    actorId: string,
    targetUserId?: string
  ): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');

    const actualHostId = (room.hostId as any)?._id?.toString() || room.hostId.toString();
    const targetId = targetUserId || actorId;
    if (targetId !== actorId && actualHostId !== actorId) {
      throw new Error('Permission denied: only host can mute others');
    }

    const target = room.participants.find((p) => p.userId.toString() === targetId);
    if (!target) throw new Error('Participant not found in room');
    target.isMuted = !target.isMuted;
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }

  async sendReaction(roomId: string, userId: string, emoji: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');

    const target = room.participants.find((p) => p.userId.toString() === userId);
    if (target) {
      target.lastReaction = emoji;
      await room.save();
    }

    const summary = this.formatRoom(room);
    const io = getIO();
    if (io) {
      io.to(`audio_room:${summary.id}`).emit(SOCKET_EVENTS.AUDIO_ROOM_REACTION, {
        roomId: summary.id,
        userId,
        emoji,
      });
      io.to(`audio_room:${summary.id}`).emit(SOCKET_EVENTS.AUDIO_ROOM_STATE, summary);
    }
    return summary;
  }

  async endRoom(roomId: string, hostId: string): Promise<AudioRoomSummary> {
    const room = await AudioRoom.findById(roomId).populate(
      'hostId',
      'username displayName avatarUrl isVerified'
    );
    if (!room) throw new Error('Audio room not found');
    const actualHostId = (room.hostId as any)?._id?.toString() || room.hostId.toString();
    if (actualHostId !== hostId) {
      throw new Error('Only the room host can end the room');
    }

    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    const summary = this.formatRoom(room);
    this.emitState(summary);
    return summary;
  }
}

export const audioRoomService = new AudioRoomService();

