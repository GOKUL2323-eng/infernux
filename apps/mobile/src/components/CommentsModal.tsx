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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { api } from '../api/client';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { CommentSummary } from '@infernux/shared';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'reel';
  targetId: string;
  onCommentAdded?: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  targetType,
  targetId,
  onCommentAdded,
}) => {
  const { colors } = useThemeStore();
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && targetId) {
      loadComments();
    }
  }, [visible, targetId]);

  const loadComments = async () => {
    setIsLoading(true);
    const endpoint = targetType === 'post' ? `/posts/${targetId}/comments` : `/reels/${targetId}/comments`;
    const res = await api.get<CommentSummary[]>(endpoint);
    setIsLoading(false);

    if (res.success && res.data) {
      setComments(res.data);
    }
  };

  const handleSendComment = async () => {
    if (!inputText.trim() || isSubmitting) return;

    const content = inputText.trim();
    setIsSubmitting(true);
    const endpoint = targetType === 'post' ? `/posts/${targetId}/comments` : `/reels/${targetId}/comments`;
    const res = await api.post<CommentSummary>(endpoint, { content });
    setIsSubmitting(false);

    if (res.success && res.data) {
      setComments((prev) => [...prev, res.data!]);
      setInputText('');
      if (onCommentAdded) onCommentAdded();
    }
  };

  const renderCommentItem = ({ item }: { item: CommentSummary }) => (
    <View style={styles.commentRow}>
      <Avatar url={item.author.avatarUrl} name={item.author.displayName} size={36} />
      <View style={styles.commentContent}>
        <View style={styles.authorLine}>
          <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
            {item.author.displayName || item.author.username}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginLeft: spacing.xs }]}>
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={[typography.body2, { color: colors.text, marginTop: 2 }]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text style={[typography.h3, { color: colors.text }]}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderCommentItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                  <Text style={[typography.body2, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    No comments yet. Start the conversation!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input Bar */}
          <View style={[styles.inputContainer, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
            <TextInput
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              style={[styles.input, { color: colors.text }]}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!inputText.trim() || isSubmitting}
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? colors.primary : colors.surface },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
                />
              )}
            </TouchableOpacity>
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
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: '65%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  closeBtn: {
    padding: spacing.xxs,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    maxHeight: 80,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});

