import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Header } from '../../src/components/Header';
import { StoryRing } from '../../src/components/StoryRing';
import { PostCard } from '../../src/components/PostCard';
import { CommentsModal } from '../../src/components/CommentsModal';
import { api } from '../../src/api/client';
import { spacing, typography, borderRadius } from '../../src/theme/spacing';
import { PostSummary } from '@infernux/shared';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const {
    posts,
    stories,
    isLoadingPosts,
    loadFeed,
    loadStories,
    likePost,
    savePost,
  } = useFeedStore();

  const [refreshing, setRefreshing] = useState(false);
  const [commentsModalPostId, setCommentsModalPostId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'following'>('all');

  useEffect(() => {
    loadFeed();
    loadStories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(true), loadStories()]);
    setRefreshing(false);
  };

  const handleShare = async (post: PostSummary) => {
    try {
      const shareUrl = `https://mozhi.app/post/${post.id}`;
      await Share.share({
        message: post.caption ? `${post.caption}\n${shareUrl}` : `Check out this post on MOZHI: ${shareUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleOptions = (post: PostSummary) => {
    const isOwner = post.authorId === user?.id;

    Alert.alert('Post Options', `@${post.author.username}`, [
      {
        text: 'Share via...',
        onPress: () => handleShare(post),
      },
      {
        text: 'Report Inappropriate',
        onPress: async () => {
          await api.post('/moderation/reports', {
            targetType: 'post',
            targetId: post.id,
            reason: 'Inappropriate content',
          });
          Alert.alert('Report Received', 'Thank you. Our moderation team has been notified.');
        },
      },
      ...(isOwner
        ? [
            {
              text: 'Delete Post',
              style: 'destructive' as const,
              onPress: async () => {
                const res = await api.delete(`/posts/${post.id}`);
                if (res.success) {
                  loadFeed(true);
                  Alert.alert('Deleted', 'Your post has been removed.');
                }
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleUserPress = (post: PostSummary) => {
    if (post.authorId === user?.id) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push('/search' as any);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Stories Tray */}
      <View style={[styles.storiesContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScroll}
        >
          {/* Current user story add button */}
          {user && (
            <StoryRing
              user={user}
              hasUnseenStories={false}
              isCurrentUser
              onPress={() => router.push('/(tabs)/create' as any)}
            />
          )}

          {/* Followed users stories */}
          {stories.map((group) => (
            <StoryRing
              key={group.user.id}
              user={group.user}
              hasUnseenStories={group.hasUnseenStories}
              onPress={() => router.push(`/story/${group.user.id}` as any)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Social Notes Quick Banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/notes/social' as any)}
        style={[styles.socialNoteBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
      >
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[typography.body2, { color: colors.text, marginLeft: spacing.xs, flex: 1 }]}>
          Social Notes: See what friends are thinking & listening to
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Feed Filters */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveFilter('all')}
          style={[styles.filterTab, activeFilter === 'all' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: activeFilter === 'all' ? colors.primary : colors.textMuted,
                fontWeight: activeFilter === 'all' ? '700' : '500',
              },
            ]}
          >
            All Posts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('following')}
          style={[styles.filterTab, activeFilter === 'following' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: activeFilter === 'following' ? colors.primary : colors.textMuted,
                fontWeight: activeFilter === 'following' ? '700' : '500',
              },
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => likePost(item.id)}
            onComment={() => setCommentsModalPostId(item.id)}
            onSave={() => savePost(item.id)}
            onShare={() => handleShare(item)}
            onUserPress={() => handleUserPress(item)}
            onOptionsPress={() => handleOptions(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoadingPosts}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoadingPosts ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Posts Yet
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                Follow friends or tap Create to share your first post!
              </Text>
            </View>
          ) : null
        }
      />

      {/* Real Comments Modal */}
      {commentsModalPostId && (
        <CommentsModal
          visible={!!commentsModalPostId}
          targetType="post"
          targetId={commentsModalPostId}
          onClose={() => setCommentsModalPostId(null)}
          onCommentAdded={() => loadFeed()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  storiesContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  storiesScroll: {
    paddingHorizontal: spacing.md,
  },
  socialNoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    marginTop: spacing.xs,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    marginRight: spacing.lg,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
