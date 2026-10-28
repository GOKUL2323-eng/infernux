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
import { useChatStore } from '../../src/store/useChatStore';
import { useCallStore } from '../../src/store/useCallStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { ConversationSummary, CallSession } from '@infernux/shared';

type ChatTab = 'direct' | 'rooms' | 'calls';

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { conversations, loadConversations, isLoading } = useChatStore();
  const { initiateCall } = useCallStore();

  const [activeTab, setActiveTab] = useState<ChatTab>('direct');
  const [callHistory, setCallHistory] = useState<CallSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    const res = await api.get<CallSession[]>('/calls/history?limit=30');
    if (res.success && res.data) {
      setCallHistory(res.data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), fetchCallHistory()]);
    setRefreshing(false);
  };

  // Filter conversations
  const directConversations = conversations.filter((c) => c.type === 'direct');
  const roomConversations = conversations.filter((c) => c.type === 'room' || c.type === 'group');

  const renderConversationItem = ({ item }: { item: ConversationSummary }) => {
    const lastMsg = item.lastMessage;
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        style={[styles.chatItem, { borderBottomColor: colors.border }]}
      >
        <Avatar
          url={item.avatarUrl}
          name={item.title || 'Chat'}
          size={52}
          isOnline={item.participants.some((p) => p.id !== user?.id && p.isOnline)}
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatTitleRow}>
            <Text
              numberOfLines={1}
              style={[
                typography.body1,
                { color: colors.text, fontWeight: isUnread ? '700' : '600', flex: 1 },
              ]}
            >
              {item.title || 'Conversation'}
            </Text>
            {lastMsg && (
              <Text style={[typography.caption, { color: colors.textMuted, marginLeft: spacing.xs }]}>
                {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>

          <View style={styles.chatBottomRow}>
            <Text
              numberOfLines={1}
              style={[
                typography.body2,
                {
                  color: isUnread ? colors.text : colors.textSecondary,
                  fontWeight: isUnread ? '600' : '400',
                  flex: 1,
                },
              ]}
            >
              {lastMsg ? lastMsg.content : 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCallItem = ({ item }: { item: CallSession }) => {
    const isOutgoing = item.initiatorId === user?.id;
    const otherUser = isOutgoing ? item.recipient : item.initiator;

    return (
      <View style={[styles.chatItem, { borderBottomColor: colors.border }]}>
        <Avatar url={otherUser?.avatarUrl} name={otherUser?.displayName || 'User'} size={48} />
        <View style={styles.chatInfo}>
          <Text style={[typography.body1, { color: colors.text, fontWeight: '600' }]}>
            {otherUser?.displayName || otherUser?.username || 'Infernux User'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons
              name={
                isOutgoing
                  ? 'arrow-up-outline'
                  : item.status === 'missed'
                  ? 'close-outline'
                  : 'arrow-down-outline'
              }
              size={14}
              color={
                item.status === 'missed'
                  ? colors.error
                  : isOutgoing
                  ? colors.primary
                  : colors.success
              }
            />
            <Text
              style={[
                typography.caption,
                {
                  color: item.status === 'missed' ? colors.error : colors.textSecondary,
                  marginLeft: 4,
                },
              ]}
            >
              {item.status.toUpperCase()} • {item.callType === 'video' ? 'Video' : 'Voice'}
              {item.duration ? ` • ${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.callActionBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={async () => {
            const call = await initiateCall(item.callType, otherUser?.id);
            if (call) router.push(`/call/${call.id}` as any);
          }}
        >
          <Ionicons
            name={item.callType === 'video' ? 'videocam' : 'call'}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h2, { color: colors.text }]}>Messages & Rooms</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/room/join' as any)}
          >
            <Ionicons name="key-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/room/create' as any)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Sub-Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surfaceElevated }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('direct')}
          style={[styles.tabBtn, activeTab === 'direct' && { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: activeTab === 'direct' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'direct' ? '700' : '500',
              },
            ]}
          >
            Direct ({directConversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('rooms')}
          style={[styles.tabBtn, activeTab === 'rooms' && { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: activeTab === 'rooms' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'rooms' ? '700' : '500',
              },
            ]}
          >
            Rooms & Keys ({roomConversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('calls')}
          style={[styles.tabBtn, activeTab === 'calls' && { backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: activeTab === 'calls' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'calls' ? '700' : '500',
              },
            ]}
          >
            Calls ({callHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {activeTab === 'calls' ? (
        <FlatList
          data={callHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="call-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Call History
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Start high-definition WebRTC voice or video calls with any friend!
              </Text>
            </View>
          }
        />
      ) : activeTab === 'rooms' ? (
        <FlatList
          data={roomConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ListHeaderComponent={
            <View style={styles.roomActionsBar}>
              <TouchableOpacity
                onPress={() => router.push('/room/create' as any)}
                style={[styles.roomActionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <Text style={[typography.body2, { color: colors.text, fontWeight: '700', marginLeft: 8 }]}>
                  Create Room
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/room/join' as any)}
                style={[styles.roomActionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <Ionicons name="key" size={20} color={colors.secondary} />
                <Text style={[typography.body2, { color: colors.text, fontWeight: '700', marginLeft: 8 }]}>
                  Join via Key
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Active Rooms
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                Create a private room to generate a cryptographic room key, or enter a room key to join!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={directConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          refreshControl={
            <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Direct Messages
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                Search for friends to start private end-to-end messaging!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  roomActionsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  roomActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chatTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  callActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});

