import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { chatService } from '../services/chat.service';
import { notificationService } from '../services/notification.service';
import { SOCKET_EVENTS } from '@infernux/shared';
import { JwtPayload } from '../middlewares/auth.middleware';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export function initializeSocketIO(io: SocketIOServer): void {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      logger.warn('Socket authentication rejected', 'SocketIO', error);
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    logger.info(`Socket connected for user ${socket.username} (${userId})`, 'SocketIO');

    // Join user's personal notification/presence room
    socket.join(`user:${userId}`);

    // Update user presence to online
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    io.emit(SOCKET_EVENTS.USER_STATUS_CHANGE, {
      userId,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    });

    // --- CONVERSATION JOIN & LEAVE ---
    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId: string) => {
      try {
        // Enforce membership authorization
        const isParticipant = await Conversation.exists({
          _id: conversationId,
          participants: userId,
        });

        if (isParticipant) {
          socket.join(`conversation:${conversationId}`);
          logger.debug(`User ${userId} joined room conversation:${conversationId}`, 'SocketIO');
        } else {
          socket.emit('error', { message: 'Unauthorized conversation room' });
        }
      } catch (err) {
        logger.error('Error joining conversation room', 'SocketIO', err);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // --- REAL-TIME MESSAGING ---
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload: any, callback?: (res: any) => void) => {
      try {
        const message = await chatService.sendMessage(userId, payload);

        // Broadcast to everyone in conversation room
        io.to(`conversation:${payload.conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

        // Also push in-app notification to participants who might be outside the active conversation view
        const conv = await Conversation.findById(payload.conversationId).select('participants type title');
        if (conv) {
          for (const pId of conv.participants) {
            const recipientId = pId.toString();
            if (recipientId !== userId) {
              await notificationService.sendNotification(
                recipientId,
                userId,
                'message',
                message.sender.displayName || 'New Message',
                payload.contentType === 'text' ? payload.content : `Sent an attachment [${payload.contentType}]`,
                { conversationId: payload.conversationId }
              );
            }
          }
        }

        if (callback) callback({ success: true, data: message });
      } catch (error: any) {
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // --- TYPING INDICATORS ---
    socket.on(SOCKET_EVENTS.TYPING_START, ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
        conversationId,
        userId,
        username: socket.username,
        isTyping: true,
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
        conversationId,
        userId,
        username: socket.username,
        isTyping: false,
      });
    });

    // --- READ RECEIPTS ---
    socket.on(SOCKET_EVENTS.MESSAGE_READ, async ({ conversationId }: { conversationId: string }) => {
      try {
        await chatService.markAsRead(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.RECEIPT_UPDATED, {
          conversationId,
          userId,
          status: 'read',
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Error handling read receipt', 'SocketIO', err);
      }
    });

    // --- VOICE & VIDEO CALL SIGNALING ---
    socket.on(SOCKET_EVENTS.CALL_INITIATE, (data: { recipientId?: string; roomId?: string; call: any }) => {
      if (data.recipientId) {
        io.to(`user:${data.recipientId}`).emit(SOCKET_EVENTS.CALL_INCOMING, data.call);
      } else if (data.roomId) {
        io.to(`room:${data.roomId}`).emit(SOCKET_EVENTS.CALL_INCOMING, data.call);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, (data: { callerId: string; callId: string }) => {
      io.to(`user:${data.callerId}`).emit(SOCKET_EVENTS.CALL_ACCEPTED, data);
    });

    socket.on(SOCKET_EVENTS.CALL_REJECTED, (data: { callerId: string; callId: string; reason?: string }) => {
      io.to(`user:${data.callerId}`).emit(SOCKET_EVENTS.CALL_REJECTED, data);
    });

    socket.on(SOCKET_EVENTS.CALL_ENDED, (data: { targetUserId: string; callId: string }) => {
      io.to(`user:${data.targetUserId}`).emit(SOCKET_EVENTS.CALL_ENDED, data);
    });

    // --- HEARTBEAT & DISCONNECT ---
    socket.on(SOCKET_EVENTS.HEARTBEAT, () => {
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected for user ${socket.username} (${userId})`, 'SocketIO');

      // Update presence
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit(SOCKET_EVENTS.USER_STATUS_CHANGE, {
        userId,
        isOnline: false,
        lastSeen: new Date().toISOString(),
      });
    });
  });
}

