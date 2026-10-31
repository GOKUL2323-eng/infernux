import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../Avatar';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { spacing, borderRadius, typography } from '../../theme/spacing';
import { CommentSummary } from '@infernux/shared';

interface ReelsCommentsSheetProps {
  visible: boolean;
  reelId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😂', '😍', '😮', '😢'];

export const ReelsCommentsSheet: React.FC<ReelsCommentsSheetProps> = ({
  visible,
  reelId,
  onClose,
  onCommentAdded,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (visible && reelId) {
      loadComments();
    }
  }, [visible, reelId]);

  const loadComments = async () => {
    setIsLoading(true);
    const res = await api.get<CommentSummary[]>(`/reels/${reelId}/comments?limit=50`);
    setIsLoading(false);
    if (res.success && res.data) {
      setComments(res.data);
    }
  };

  const handleSendComment = async () => {
    if (!inputText.trim() || isSubmitting) return;

    const content = replyingTo ? `@${replyingTo} ${inputText.trim()}` : inputText.trim();
    setIsSubmitting(true);
    const res = await api.post<CommentSummary>(`/reels/${reelId}/comments`, { content });
    setIsSubmitting(false);

    if (res.success && res.data) {
      setComments((prev) => [...prev, res.data!]);
      setInputText('');
      setReplyingTo(null);
      if (onCommentAdded) onCommentAdded();
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setInputText((prev) => `${prev}${emoji}`);
  };

  const toggleLikeComment = (commentId: string) => {
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const formatTimestamp = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const renderCommentItem = ({ item }: { item: CommentSummary }) => {
    const isLiked = likedCommentIds.has(item.id);
    const likeCount = (item.likesCount || 0) + (isLiked ? 1 : 0);

    return (
      <View style={styles.commentRow}>
        <Avatar url={item.author.avatarUrl} name={item.author.displayName} size={38} isVerified={item.author.isVerified} />
        <View style={styles.commentBody}>
          <View style={styles.authorLine}>
            <Text style={styles.usernameText}>
              {item.author.username || item.author.displayName}
            </Text>
            <Text style={styles.timestampText}>{formatTimestamp(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          <TouchableOpacity
            onPress={() => setReplyingTo(item.author.username)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.replyButton}
          >
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {/* Comment Like Heart */}
        <TouchableOpacity
          onPress={() => toggleLikeComment(item.id)}
          style={styles.likeCommentBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isLiked ? '#FF2E63' : '#8E8E93'}
          />
          {likeCount > 0 && (
            <Text style={[styles.likeCommentCount, isLiked && { color: '#FF2E63' }]}>
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Sheet Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderCommentItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={44} color="#555" />
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtitle}>Start the conversation.</Text>
                </View>
              }
            />
          )}

          {/* Replying indicator banner */}
          {replyingTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Replying to <Text style={styles.replyBannerUsername}>@{replyingTo}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Emoji Reaction Bar */}
          <View style={styles.quickEmojisBar}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <Avatar url={user?.avatarUrl} name={user?.displayName} size={36} />
            <TextInput
              style={styles.input}
              placeholder={`Add a comment as ${user?.username || 'you'}...`}
              placeholderTextColor="#8E8E93"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={isSubmitting}
                style={styles.sendBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up-circle" size={32} color="#6366F1" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
    height: Dimensions.get('window').height * 0.72,
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  commentBody: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  timestampText: {
    color: '#8E8E93',
    fontSize: 11,
    marginLeft: 6,
  },
  commentText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13.5,
    lineHeight: 18,
    marginTop: 2,
  },
  replyButton: {
    marginTop: 4,
  },
  replyText: {
    color: '#8E8E93',
    fontSize: 11.5,
    fontWeight: '600',
  },
  likeCommentBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  likeCommentCount: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E2C',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#262635',
  },
  replyBannerText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  replyBannerUsername: {
    color: '#6366F1',
    fontWeight: '700',
  },
  quickEmojisBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#262635',
  },
  emojiBtn: {
    padding: 6,
  },
  emojiText: {
    fontSize: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: '#1E1E2C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13.5,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
