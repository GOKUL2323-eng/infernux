import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Notification, INotificationDocument } from '../models/Notification';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { NotificationType, AppNotification } from '@infernux/shared';

const expo = new Expo();

export class NotificationService {
  async registerPushToken(userId: string, token: string): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
      logger.warn(`Invalid Expo push token: ${token}`, 'NotificationService');
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { pushTokens: token },
    });
  }

  async sendNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<AppNotification | null> {
    if (recipientId === actorId) return null; // Don't notify self

    const recipient = await User.findById(recipientId);
    if (!recipient) return null;

    // Check notification preferences
    const prefs = recipient.notifications;
    if (type === 'message' && !prefs.directMessages) return null;
    if (type === 'call_incoming' && !prefs.calls) return null;
    if (type === 'post_like' && !prefs.likes) return null;
    if (type === 'post_comment' && !prefs.comments) return null;
    if (type === 'follow' && !prefs.follows) return null;

    const notification = new Notification({
      recipientId,
      actorId,
      type,
      title,
      body,
      data,
    });
    await notification.save();

    const actor = await User.findById(actorId).select('username displayName avatarUrl isVerified');

    // Send native Expo Push Notification if tokens exist
    if (recipient.pushTokens && recipient.pushTokens.length > 0) {
      const messages: ExpoPushMessage[] = recipient.pushTokens
        .filter((token) => Expo.isExpoPushToken(token))
        .map((to) => ({
          to,
          sound: 'default',
          title,
          body,
          data: { ...data, type, notificationId: notification._id.toString() },
          priority: type.startsWith('call') ? 'high' : 'default',
          channelId: type.startsWith('call') ? 'calls' : 'messages',
        }));

      if (messages.length > 0) {
        try {
          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
        } catch (error) {
          logger.error('Failed to send Expo push notification', 'NotificationService', error);
        }
      }
    }

    return {
      id: notification._id.toString(),
      recipientId,
      actorId,
      actor: {
        id: actorId,
        username: actor?.username || '',
        displayName: actor?.displayName || '',
        avatarUrl: actor?.avatarUrl,
        isVerified: actor?.isVerified,
      },
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  async getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
    const list = await Notification.find({ recipientId: userId })
      .populate('actorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(limit);

    return list.map((n) => {
      const actor = n.actorId as any;
      return {
        id: n._id.toString(),
        recipientId: userId,
        actorId: actor ? actor._id.toString() : '',
        actor: {
          id: actor ? actor._id.toString() : '',
          username: actor?.username || '',
          displayName: actor?.displayName || '',
          avatarUrl: actor?.avatarUrl,
          isVerified: actor?.isVerified,
        },
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      };
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate({ _id: notificationId, recipientId: userId }, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
  }
}

export const notificationService = new NotificationService();
