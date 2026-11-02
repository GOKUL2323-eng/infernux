import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { DoubleTapLikeOverlay } from './common/DoubleTapLikeOverlay';
import { AnimatedLikeButton } from './common/AnimatedLikeButton';
import { sanitizeMediaUrl } from '../utils/uploadHelper';
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
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* 1. Creator Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorRow} onPress={onUserPress} activeOpacity={0.8}>
          <Avatar
            url={post.author.avatarUrl}
            name={post.author.displayName}
            size={40}
            isVerified={post.author.isVerified}
          />
          <View style={styles.authorTextContainer}>
            <View style={styles.nameVerifiedRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[typography.body2, styles.authorName, { color: colors.text }]}
              >
                {post.author.displayName || post.author.username}
              </Text>
              {post.author.isVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={colors.primary}
                  style={styles.verifiedIcon}
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[typography.caption, { color: colors.textSecondary }]}
            >
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

      {/* 2. Media Image / Video with Double-Tap Like Burst */}
      {primaryMedia && (
        <View style={styles.mediaOuterWrapper}>
          <DoubleTapLikeOverlay
            isLiked={post.isLiked}
            onLike={onLike}
            style={styles.mediaContainer}
          >
            <Image
              source={{ uri: sanitizeMediaUrl(primaryMedia.url) }}
              style={[styles.media, { backgroundColor: colors.surface }]}
            />
            {primaryMedia.type === 'video' && (
              <View style={[styles.videoBadge, { backgroundColor: 'rgba(8, 6, 13, 0.75)' }]}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </View>
            )}
          </DoubleTapLikeOverlay>
        </View>
      )}

      {/* 3. Action Buttons Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <AnimatedLikeButton
            isLiked={post.isLiked}
            onPress={onLike}
            size={25}
            colorActive={colors.accent}
          />
          <TouchableOpacity
            onPress={onComment}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.actionBtn}
          >
            <Ionicons name="chatbubble-outline" size={23} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={styles.actionBtn}
          >
            <Ionicons name="paper-plane-outline" size={23} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.saveBtn}
        >
          <Ionicons
            name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={23}
            color={post.isSaved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* 4. Engagement & Caption Details */}
      <View style={styles.contentPadding}>
        {/* Likes Count */}
        <Text style={[typography.body2, styles.likesText, { color: colors.text }]}>
          {post.likesCount.toLocaleString()} {post.likesCount === 1 ? 'like' : 'likes'}
        </Text>

        {/* Caption */}
        {post.caption ? (
          <Text style={[typography.body2, { color: colors.text, marginTop: 4, lineHeight: 20 }]}>
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {post.author.username}{' '}
            </Text>
            {post.caption}
          </Text>
        ) : null}

        {/* Comments Count Shortcut */}
        {post.commentsCount > 0 && (
          <TouchableOpacity
            onPress={onComment}
            style={styles.commentShortcut}
            activeOpacity={0.7}
          >
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
  cardContainer: {
    marginHorizontal: spacing.sm + 4,
    marginBottom: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
      } as any,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  authorTextContainer: {
    marginLeft: spacing.sm + 2,
    flex: 1,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  optionsBtn: {
    padding: spacing.xs,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOuterWrapper: {
    width: '100%',
    paddingHorizontal: 8,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
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
    borderRadius: 14,
    padding: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentPadding: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 14,
  },
  likesText: {
    fontWeight: '700',
  },
  commentShortcut: {
    marginTop: 6,
  },
});
