import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, typography } from '../theme/spacing';
import { PostSummary } from '@infernux/shared';

interface PostCardProps {
  post: PostSummary;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onShare: () => void;
  onUserPress: () => void;
  onOptionsPress?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onSave,
  onShare,
  onUserPress,
  onOptionsPress,
}) => {
  const { colors } = useThemeStore();
  const primaryMedia = post.media && post.media.length > 0 ? post.media[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorRow} onPress={onUserPress} activeOpacity={0.8}>
          <Avatar url={post.author.avatarUrl} name={post.author.displayName} size={38} isVerified={post.author.isVerified} />
          <View style={styles.authorTextContainer}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.body2, { color: colors.text, fontWeight: '700' }]}>
              {post.author.displayName || post.author.username}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.caption, { color: colors.textSecondary }]}>
              @{post.author.username}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOptionsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.optionsBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Media Image / Video */}
      {primaryMedia && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: primaryMedia.url }}
            style={[styles.media, { backgroundColor: colors.surfaceElevated }]}
          />
          {primaryMedia.type === 'video' && (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={onLike}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.actionBtn}
          >
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={post.isLiked ? colors.error : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onComment}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.actionBtn}
          >
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={onSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={post.isSaved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Likes count */}
      <View style={styles.contentPadding}>
        <Text style={[typography.body2, { color: colors.text, fontWeight: '700' }]}>
          {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
        </Text>

        {/* Caption */}
        {post.caption ? (
          <Text style={[typography.body2, { color: colors.text, marginTop: spacing.xs }]}>
            <Text style={{ fontWeight: '700' }}>{post.author.username} </Text>
            {post.caption}
          </Text>
        ) : null}

        {/* Comments count shortcut */}
        {post.commentsCount > 0 && (
          <TouchableOpacity onPress={onComment} style={{ marginTop: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              View all {post.commentsCount} comments
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  authorTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  optionsBtn: {
    padding: spacing.xs,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    marginRight: spacing.md,
  },
  contentPadding: {
    paddingHorizontal: spacing.md,
  },
});

