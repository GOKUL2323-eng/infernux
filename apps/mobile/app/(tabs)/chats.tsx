import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { conversations, loadConversations, isLoading } = useChatStore();
  const { initiateCall } = useCallStore();

  const [activeTab, setActiveTab] = useState<ChatTab>('direct');
  const [callHistory, setCallHistory] = useState<CallSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
    fetchCallHistory();
  }, [user?.id]);

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
  const directConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === 'direct')
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = c.title?.toLowerCase().includes(q);
        const lastMsgMatch = c.lastMessage?.content?.toLowerCase().includes(q);
        const userMatch = c.participants?.some(
          (p) => p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
        );
        return titleMatch || lastMsgMatch || userMatch;
      });
  }, [conversations, searchQuery]);

  const roomConversations = useMemo(() => {
    return conversations
      .filter((c) => c.type === 'room' || c.type === 'group')
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = c.title?.toLowerCase().includes(q);
        const lastMsgMatch = c.lastMessage?.content?.toLowerCase().includes(q);
        return titleMatch || lastMsgMatch;
      });
  }, [conversations, searchQuery]);

  const filteredCallHistory = useMemo(() => {
    return callHistory.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const otherUser = c.initiatorId === user?.id ? c.recipient : c.initiator;
      return (
        otherUser?.displayName?.toLowerCase().includes(q) ||
        otherUser?.username?.toLowerCase().includes(q)
      );
    });
  }, [callHistory, searchQuery, user?.id]);

  // Extract online & recent conversation partners for the Instagram-style active tray
  const activeContacts = useMemo(() => {
    const map = new Map<string, { id: string; username: string; displayName: string; avatarUrl?: string; isOnline?: boolean }>();
    conversations.forEach((c) => {
      c.participants?.forEach((p) => {
        if (p.id !== user?.id && !map.has(p.id)) {
          map.set(p.id, p);
        }
      });
    });
    return Array.from(map.values());
  }, [conversations, user?.id]);

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins}m`;
    }
    if (diffHours < 24) {
      return `${diffHours}h`;
    }
    if (diffHours < 168) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderActiveContactItem = (contact: { id: string; username: string; displayName: string; avatarUrl?: string; isOnline?: boolean }) => {
    // Find conversation with this contact
    const conv = conversations.find(
      (c) => c.type === 'direct' && c.participants.some((p) => p.id === contact.id)
    );

    return (
      <TouchableOpacity
        key={contact.id}
        style={styles.activeContactItem}
        activeOpacity={0.8}
        onPress={() => {
          if (conv) {
            router.push(`/chat/${conv.id}` as any);
          } else {
            router.push('/search' as any);
          }
        }}
      >
        <View style={styles.activeAvatarWrapper}>
          <Avatar
            url={contact.avatarUrl}
            name={contact.displayName || contact.username}
            size={56}
            isOnline={contact.isOnline}
          />
        </View>
        <Text numberOfLines={1} style={[styles.activeContactName, { color: colors.text }]}>
          {contact.displayName ? contact.displayName.split(' ')[0] : contact.username}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }: { item: ConversationSummary }) => {
    const lastMsg = item.lastMessage;
    const isUnread = item.unreadCount > 0;
    const isOnline = item.participants.some((p) => p.id !== user?.id && p.isOnline);
    const otherParticipant = item.participants.find((p) => p.id !== user?.id);
    const isRoom = item.type === 'room' || item.type === 'group';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        style={[
          styles.chatRow,
          { borderBottomColor: colors.border },
          isUnread && { backgroundColor: colors.surfaceElevated + '40' },
        ]}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <Avatar
            url={item.avatarUrl || otherParticipant?.avatarUrl}
            name={item.title || otherParticipant?.displayName || 'Chat'}
            size={54}
            isOnline={isOnline}
            isVerified={otherParticipant?.isVerified}
          />
          {isRoom && (
            <View style={[styles.roomTypeBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Conversation Details */}
        <View style={styles.chatDetails}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.titleText,
                { color: colors.text, fontWeight: isUnread ? '700' : '600' },
              ]}
            >
              {item.title || otherParticipant?.displayName || otherParticipant?.username || 'Conversation'}
            </Text>

            {lastMsg && (
              <Text style={[styles.timeText, { color: isUnread ? colors.primary : colors.textMuted }]}>
                {formatMessageTime(lastMsg.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.messagePreviewRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.previewText,
                {
                  color: isUnread ? colors.text : colors.textSecondary,
                  fontWeight: isUnread ? '700' : '400',
                },
              ]}
            >
              {lastMsg
                ? lastMsg.senderId === user?.id
                  ? `You: ${lastMsg.content}`
                  : lastMsg.content
                : isRoom
                ? 'Protected room conversation'
                : 'Tap to start chatting'}
            </Text>

            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCountText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
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
      <View style={[styles.chatRow, { borderBottomColor: colors.border }]}>
        <Avatar url={otherUser?.avatarUrl} name={otherUser?.displayName || 'User'} size={52} />
        <View style={styles.chatDetails}>
          <Text numberOfLines={1} style={[styles.titleText, { color: colors.text, fontWeight: '600' }]}>
            {otherUser?.displayName || otherUser?.username || 'MOZHI Contact'}
          </Text>
          <View style={styles.callMetaRow}>
            <Ionicons
              name={
                item.status === 'missed'
                  ? 'arrow-down-outline'
                  : isOutgoing
                  ? 'arrow-up-outline'
                  : 'arrow-down-outline'
              }
              size={13}
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
                styles.callMetaText,
                {
                  color: item.status === 'missed' ? colors.error : colors.textSecondary,
                },
              ]}
            >
              {item.status === 'missed' ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'} •{' '}
              {item.callType === 'video' ? 'Video' : 'Voice'}
              {item.duration ? ` • ${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.callActionPill, { backgroundColor: colors.surfaceElevated }]}
          onPress={async () => {
            const call = await initiateCall(item.callType, otherUser?.id);
            if (call) router.push(`/call/${call.id}` as any);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.callType === 'video' ? 'videocam' : 'call'}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Instagram-Inspired Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>
            {user?.username ? `@${user.username}` : 'Messages'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Join via Key icon */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => router.push('/room/join' as any)}
          >
            <Ionicons name="key-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          {/* Create Room icon */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => router.push('/room/create' as any)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* New message / Search user icon */}
          <TouchableOpacity
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Instagram-Style Rounded Search Field */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search direct messages, rooms, and calls..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Online Friends / Active Contacts Horizontal Tray */}
      {activeContacts.length > 0 && (
        <View style={styles.activeTrayContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeTrayContent}
          >
            {/* User's own "Your note" bubble */}
            <TouchableOpacity
              style={styles.activeContactItem}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/create' as any)}
            >
              <View style={styles.activeAvatarWrapper}>
                <Avatar url={user?.avatarUrl} name={user?.displayName || 'You'} size={56} />
                <View style={[styles.addNoteBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={12} color="#FFFFFF" />
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.activeContactName, { color: colors.textSecondary }]}>
                Your note
              </Text>
            </TouchableOpacity>

            {/* Other contacts */}
            {activeContacts.map(renderActiveContactItem)}
          </ScrollView>
        </View>
      )}

      {/* 4. Segmented Sub-Tabs (Direct, Rooms, Calls) */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surfaceElevated }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('direct')}
          style={[styles.tabBtn, activeTab === 'direct' && { backgroundColor: colors.surface }]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'direct' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'direct' ? '700' : '600',
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
            numberOfLines={1}
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'rooms' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'rooms' ? '700' : '600',
              },
            ]}
          >
            Rooms ({roomConversations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('calls')}
          style={[styles.tabBtn, activeTab === 'calls' && { backgroundColor: colors.surface }]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.tabBtnText,
              {
                color: activeTab === 'calls' ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === 'calls' ? '700' : '600',
              },
            ]}
          >
            Calls ({callHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Conversation Lists */}
      {activeTab === 'calls' ? (
        <FlatList
          data={filteredCallHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="call-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Call History
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.roomActionsBar}>
              <TouchableOpacity
                onPress={() => router.push('/room/create' as any)}
                style={[
                  styles.roomActionCard,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={[styles.roomActionText, { color: colors.text }]}>Create Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/room/join' as any)}
                style={[
                  styles.roomActionCard,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Ionicons name="key" size={19} color={colors.secondary} />
                <Text style={[styles.roomActionText, { color: colors.text }]}>Join via Key</Text>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  activeTrayContainer: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  activeTrayContent: {
    paddingHorizontal: spacing.md,
    gap: 14,
  },
  activeContactItem: {
    alignItems: 'center',
    width: 66,
  },
  activeAvatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  addNoteBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  activeContactName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: 8,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    position: 'relative',
  },
  roomTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  chatDetails: {
    flex: 1,
    marginLeft: spacing.sm + 4,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 15,
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  previewText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  callMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  callActionPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  roomActionsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 10,
  },
  roomActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  roomActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
});
