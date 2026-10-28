import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { AppNotification } from '@infernux/shared';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const res = await api.get<AppNotification[]>('/notifications?limit=50');
    if (res.success && res.data) {
      setNotifications(res.data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_like':
      case 'reel_like':
        return { name: 'heart' as const, color: colors.error };
      case 'post_comment':
      case 'reel_comment':
        return { name: 'chatbubble' as const, color: colors.info };
      case 'follow':
        return { name: 'person-add' as const, color: colors.primary };
      case 'call_missed':
        return { name: 'call' as const, color: colors.error };
      default:
        return { name: 'notifications' as const, color: colors.primary };
    }
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    const iconConfig = getNotificationIcon(item.type);

    return (
      <View
        style={[
          styles.itemRow,
          { borderBottomColor: colors.border },
          !item.isRead && { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <Avatar url={item.actor.avatarUrl} name={item.actor.displayName} size={44} isVerified={item.actor.isVerified} />
        <View style={styles.content}>
          <Text style={[typography.body2, { color: colors.text }]}>
            <Text style={{ fontWeight: '700' }}>{item.actor.displayName || item.actor.username} </Text>
            {item.body}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.iconTag}>
          <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
              All Caught Up!
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 4 }]}>
              No new notifications right now.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  iconTag: {
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});

