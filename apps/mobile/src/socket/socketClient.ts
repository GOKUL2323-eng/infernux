import { io, Socket } from 'socket.io-client';
import { getAccessToken, API_BASE_URL } from '../api/client';
import { SOCKET_EVENTS } from '@infernux/shared';

class SocketClient {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    // Strip '/api/v1' from API_BASE_URL to get socket root URL
    this.serverUrl = API_BASE_URL.replace('/api/v1', '');
  }

  async connect(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = await getAccessToken();

    this.socket = io(this.serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to Infernux Realtime Engine');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
  }

  startTyping(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }

  stopTyping(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }

  sendReadReceipt(conversationId: string): void {
    this.socket?.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId });
  }
}

export const socketClient = new SocketClient();
