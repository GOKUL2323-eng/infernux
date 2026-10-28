import { create } from 'zustand';
import { api } from '../api/client';
import { socketClient } from '../socket/socketClient';
import { CallSession, CallType, SOCKET_EVENTS } from '@infernux/shared';

interface CallState {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  callDuration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;

  initiateCall: (type: CallType, recipientId?: string, roomId?: string) => Promise<CallSession | null>;
  setIncomingCall: (call: CallSession | null) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  toggleCameraFacing: () => void;
  incrementDuration: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  callDuration: 0,
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: false,
  isFrontCamera: true,

  initiateCall: async (callType: CallType, recipientId?: string, roomId?: string) => {
    const res = await api.post<CallSession>('/calls/initiate', {
      callType,
      recipientId,
      roomId,
    });

    if (res.success && res.data) {
      set({
        activeCall: res.data,
        isVideoEnabled: callType === 'video',
        callDuration: 0,
      });

      // Emit signaling via socket
      const socket = socketClient.getSocket();
      socket?.emit(SOCKET_EVENTS.CALL_INITIATE, {
        recipientId,
        roomId,
        call: res.data,
      });

      return res.data;
    }
    return null;
  },

  setIncomingCall: (call: CallSession | null) => {
    set({ incomingCall: call });
  },

  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const res = await api.post<CallSession>(`/calls/${incomingCall.id}/respond`, {
      action: 'accept',
    });

    if (res.success && res.data) {
      // Fetch LiveKit token for this participant
      const tokenRes = await api.get<{ token: string; serverUrl: string }>(`/calls/${incomingCall.id}/token`);
      const token = tokenRes.data?.token;

      set({
        activeCall: {
          ...res.data,
          livekitToken: token,
        },
        incomingCall: null,
        isVideoEnabled: incomingCall.callType === 'video',
        callDuration: 0,
      });

      const socket = socketClient.getSocket();
      socket?.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        callerId: incomingCall.initiatorId,
        callId: incomingCall.id,
      });
    }
  },

  rejectCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    await api.post(`/calls/${incomingCall.id}/respond`, { action: 'reject' });

    const socket = socketClient.getSocket();
    socket?.emit(SOCKET_EVENTS.CALL_REJECTED, {
      callerId: incomingCall.initiatorId,
      callId: incomingCall.id,
    });

    set({ incomingCall: null });
  },

  endCall: async () => {
    const { activeCall, callDuration } = get();
    if (!activeCall) return;

    await api.post(`/calls/${activeCall.id}/end`, { durationSeconds: callDuration });

    const socket = socketClient.getSocket();
    if (activeCall.recipientId) {
      socket?.emit(SOCKET_EVENTS.CALL_ENDED, {
        targetUserId: activeCall.recipientId,
        callId: activeCall.id,
      });
    }

    set({ activeCall: null, callDuration: 0 });
  },

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set((state) => ({ isVideoEnabled: !state.isVideoEnabled })),
  toggleSpeaker: () => set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),
  toggleCameraFacing: () => set((state) => ({ isFrontCamera: !state.isFrontCamera })),
  incrementDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),
}));
