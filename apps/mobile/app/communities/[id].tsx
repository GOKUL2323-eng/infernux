import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/useThemeStore';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import {
  CommunityChannelSummary,
  CommunityPostSummary,
  CommunitySummary,
} from '@infernux/shared';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useThemeStore();

  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [channels, setChannels] = useState<CommunityChannelSummary[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  // Thread modal
  const [activeThread, setActiveThread] = useState<CommunityPostSummary | null>(null);
  const [replies, setReplies] = useState<CommunityPostSummary[]>([]);
  const [replyText, setReplyText] = useState('');

  // Create channel modal
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'discussion' | 'announcement' | 'thread' | 'resources'>('discussion');

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.get<{ community: CommunitySummary; channels: CommunityChannelSummary[] }>(
      `/communities/${id}`
    );
    if (res.success && res.data) {
      setCommunity(res.data.community);
      setChannels(res.data.channels);
      const firstId = selectedChannelId || res.data.channels[0]?.id || '';
      setSelectedChannelId(firstId);
      if (firstId) {
        await loadPosts(firstId, searchQuery);
      }
    }
    setLoading(false);
  };

  const loadPosts = async (channelId: string, query = '') => {
    if (!id || !channelId) return;
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    const res = await api.get<CommunityPostSummary[]>(`/communities/${id}/channels/${channelId}/posts${qs}`);
    if (res.success && res.data) setPosts(res.data);
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSelectChannel = async (channelId: string) => {
    setSelectedChannelId(channelId);
    await loadPosts(channelId, searchQuery);
  };

  const handleCreatePost = async () => {
    if (!id || !selectedChannelId || !newPostContent.trim()) return;
    setPosting(true);
    const res = await api.post<CommunityPostSummary>(
      `/communities/${id}/channels/${selectedChannelId}/posts`,
      {
        title: newPostTitle.trim() || undefined,
        content: newPostContent.trim(),
        attachments: [],
      }
    );
    setPosting(false);
    if (res.success) {
      setNewPostTitle('');
      setNewPostContent('');
      await loadPosts(selectedChannelId, searchQuery);
    } else {
      Alert.alert('Cannot Post', res.error?.message || 'Permission denied');
    }
  };

  const handleTogglePin = async (postId: string) => {
    const res = await api.post<CommunityPostSummary>(`/communities/${id}/posts/${postId}/pin`);
    if (res.success) {
      await loadPosts(selectedChannelId, searchQuery);
    } else {
      Alert.alert('Restricted', res.error?.message || 'Only moderators can pin posts');
    }
  };

  const openThread = async (post: CommunityPostSummary) => {
    setActiveThread(post);
    const res = await api.get<CommunityPostSummary[]>(
      `/communities/${id}/channels/${selectedChannelId}/posts?parentPostId=${post.id}`
    );
    if (res.success && res.data) setReplies(res.data);
  };

  const handleSendReply = async () => {
    if (!activeThread || !replyText.trim()) return;
    const res = await api.post<CommunityPostSummary>(
      `/communities/${id}/channels/${selectedChannelId}/posts`,
      { content: replyText.trim(), parentPostId: activeThread.id, attachments: [] }
    );
    if (res.success) {
      setReplyText('');
      await openThread(activeThread);
      await loadPosts(selectedChannelId, searchQuery);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) return;
    const res = await api.post<CommunityChannelSummary>(`/communities/${id}/channels`, {
      name: channelName.trim().toLowerCase().replace(/\s+/g, '-'),
      type: channelType,
      isAnnouncementOnly: channelType === 'announcement',
    });
    if (res.success && res.data) {
      setShowCreateChannel(false);
      setChannelName('');
      await loadDetail();
      setSelectedChannelId(res.data.id);
      await loadPosts(res.data.id);
    } else {
      Alert.alert('Error', res.error?.message || 'Could not create channel');
    }
  };

  const isModOrOwner = community?.myRole === 'owner' || community?.myRole === 'moderator';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text numberOfLines={1} style={[typography.h3, { color: colors.text }]}>
            {community?.name || 'Community'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
            {community?.membersCount || 0} members • Role: {community?.myRole || 'guest'}
          </Text>
        </View>
        {isModOrOwner && (
          <TouchableOpacity onPress={() => setShowCreateChannel(true)} style={styles.iconBtn}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Channels Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {channels.map((ch) => {
              const active = ch.id === selectedChannelId;
              return (
                <TouchableOpacity
                  key={ch.id}
                  onPress={() => handleSelectChannel(ch.id)}
                  style={[
                    styles.channelChip,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={ch.isAnnouncementOnly ? 'megaphone-outline' : 'chatbox-ellipses-outline'}
                    size={14}
                    color={active ? '#FFFFFF' : colors.accent}
                  />
                  <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 12 }}>
                    #{ch.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Channel */}
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => loadPosts(selectedChannelId, searchQuery)}
              placeholder="Search inside channel..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.text, fontSize: 13 }}
            />
            <TouchableOpacity onPress={() => loadPosts(selectedChannelId, searchQuery)}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Post Composer */}
          {community?.isMember ? (
            <View style={[styles.composerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                placeholder="Thread title (optional)"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
              <TextInput
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="Share a post or discussion prompt..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 62 }]}
              />
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={posting}
                style={[styles.postBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  {posting ? 'Posting...' : 'Publish to Channel'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Channel Posts */}
          {posts.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>
              No posts in this channel yet.
            </Text>
          ) : (
            posts.map((p) => (
              <View key={p.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: p.pinned ? colors.accent : colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>
                    @{p.author.username} {p.pinned ? '• PINNED' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {isModOrOwner && (
                      <TouchableOpacity onPress={() => handleTogglePin(p.id)}>
                        <Ionicons name="pin-outline" size={16} color={p.pinned ? colors.accent : colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => openThread(p)}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                        Replies ({p.repliesCount})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {p.title ? (
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 4 }}>{p.title}</Text>
                ) : null}
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{p.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Thread Modal */}
      <Modal visible={!!activeThread} transparent animationType="slide" onRequestClose={() => setActiveThread(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={[typography.h3, { color: colors.text }]}>{activeThread?.title || 'Thread Replies'}</Text>
              <TouchableOpacity onPress={() => setActiveThread(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {replies.map((r) => (
                <View key={r.id} style={[styles.replyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 11 }}>@{r.author.username}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>{r.content}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write a reply..."
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
              <TouchableOpacity onPress={handleSendReply} style={[styles.postBtn, { backgroundColor: colors.primary, alignSelf: 'center' }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Channel Modal */}
      <Modal visible={showCreateChannel} transparent animationType="fade" onRequestClose={() => setShowCreateChannel(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 10 }]}>Create Channel</Text>
            <TextInput
              value={channelName}
              onChangeText={setChannelName}
              placeholder="Channel name (e.g. feedback)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['discussion', 'announcement', 'thread', 'resources'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setChannelType(t)}
                  style={[
                    styles.channelChip,
                    { backgroundColor: channelType === t ? colors.primary : colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCreateChannel(false)} style={{ padding: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateChannel} style={[styles.postBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  composerCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  postBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  postCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  replyItem: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 8,
  },
});

