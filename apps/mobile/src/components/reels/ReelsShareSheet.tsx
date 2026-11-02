import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Avatar } from '../Avatar';
import { api } from '../../api/client';
import { useFeedStore } from '../../store/useFeedStore';
import { spacing } from '../../theme/spacing';
import { ReelSummary } from '@infernux/shared';

interface ReelsShareSheetProps {
  visible: boolean;
  reel: ReelSummary | null;
  onClose: () => void;
}

interface ChatConversationSummary {
  id: string;
  type: 'direct' | 'group' | 'room';
  title?: string;
  participants: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  }>;
}

export const ReelsShareSheet: React.FC<ReelsShareSheetProps> = ({
  visible,
  reel,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { recordReelShare } = useFeedStore();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentConversationIds, setSentConversationIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadConversations();
      setSentConversationIds(new Set());
      setSearchQuery('');
    }
  }, [visible]);

  const loadConversations = async () => {
    setIsLoading(true);
    const res = await api.get<ChatConversationSummary[]>('/chats/conversations');
    setIsLoading(false);
    if (res.success && res.data) {
      setConversations(res.data);
    }
  };

  const handleSendToChat = async (conversationId: string) => {
    if (!reel || sendingId) return;

    setSendingId(conversationId);
    try {
      await api.post(`/chats/conversations/${conversationId}/messages`, {
        contentType: 'shared_reel',
        content: reel.caption ? `Shared Reel: ${reel.caption}` : 'Shared a Reel',
        metadata: {
          reelId: reel.id,
          videoUrl: reel.videoUrl,
          thumbnailUrl: reel.thumbnailUrl,
          creatorUsername: reel.creator.username,
          caption: reel.caption,
        },
      });

      setSentConversationIds((prev) => new Set(prev).add(conversationId));
      await recordReelShare(reel.id);
    } catch {
      Alert.alert('Error', 'Could not share reel to this conversation.');
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyLink = async () => {
    if (!reel) return;
    const shareUrl = `https://mozhi.app/reel/${reel.id}`;
    await Clipboard.setStringAsync(shareUrl);
    await recordReelShare(reel.id);
    Alert.alert('Link Copied', 'Reel link copied to your clipboard!');
  };

  const handleNativeShare = async () => {
    if (!reel) return;
    try {
      const shareUrl = `https://mozhi.app/reel/${reel.id}`;
      await Share.share({
        message: reel.caption
          ? `${reel.caption}\n${shareUrl}`
          : `Watch @${reel.creator.username}'s reel on MOZHI: ${shareUrl}`,
        url: shareUrl,
      });
      await recordReelShare(reel.id);
    } catch {
      // ignore
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = c.title?.toLowerCase().includes(q);
    const userMatch = c.participants?.some(
      (p) => p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q)
    );
    return titleMatch || userMatch;
  });

  const renderConversationItem = ({ item }: { item: ChatConversationSummary }) => {
    const isSent = sentConversationIds.has(item.id);
    const isSending = sendingId === item.id;
    const firstParticipant = item.participants?.[0];
    const name = item.title || firstParticipant?.displayName || firstParticipant?.username || 'Chat';
    const subtitle = `@${firstParticipant?.username || 'user'}`;

    return (
      <View style={styles.convRow}>
        <Avatar
          url={firstParticipant?.avatarUrl}
          name={name}
          size={44}
          isVerified={firstParticipant?.isVerified}
        />
        <View style={styles.convDetails}>
          <Text numberOfLines={1} style={styles.convName}>
            {name}
          </Text>
          <Text numberOfLines={1} style={styles.convSubtitle}>
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleSendToChat(item.id)}
          disabled={isSent || isSending}
          style={[
            styles.sendActionBtn,
            isSent && styles.sentActionBtn,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isSent ? (
            <Text style={styles.sentBtnText}>Sent</Text>
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Sheet Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share to</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people and chats..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Conversations list */}
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="paper-plane-outline" size={40} color="#555" />
                  <Text style={styles.emptyTitle}>No active chats</Text>
                  <Text style={styles.emptySubtitle}>Use the share options below</Text>
                </View>
              }
            />
          )}

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={handleCopyLink}>
              <View style={styles.iconCircle}>
                <Ionicons name="link" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.iconLabel}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIconBtn} onPress={handleNativeShare}>
              <View style={styles.iconCircle}>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.iconLabel}>Share via...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => {
                onClose();
                Alert.alert('Story', 'Adding to story is ready from Create screen.');
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.iconLabel}>Add to story</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    height: Dimensions.get('window').height * 0.65,
    backgroundColor: '#16161E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: '#262635',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A4A5A',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262635',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21152B',
    borderRadius: 14,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#30233B',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: 4,
  },
  convDetails: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  convName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  convSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 1,
  },
  sendActionBtn: {
    backgroundColor: '#A020F0',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  sentActionBtn: {
    backgroundColor: '#21152B',
    borderWidth: 1,
    borderColor: '#30233B',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sentBtnText: {
    color: '#8E8E93',
    fontSize: 12.5,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: '#262635',
  },
  actionIconBtn: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E2C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D2D3D',
    marginBottom: 4,
  },
  iconLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

