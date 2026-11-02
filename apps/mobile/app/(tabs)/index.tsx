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
  const { user, isAuthenticated } = useAuthStore();
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
    if (isAuthenticated) {
      loadFeed(true);
      loadStories();
    }
  }, [isAuthenticated, user?.id]);

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
    <View style={styles.feedHeaderWrapper}>
      {/* 1. Stories Tray */}
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
              onPress={() => router.push({ pathname: '/(tabs)/create', params: { initialMode: 'story' } } as any)}
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

      {/* 2. Social Notes Quick Banner */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/notes/social' as any)}
        style={[
          styles.socialNoteBanner,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="sparkles" size={18} color={colors.accent} />
        <Text style={[typography.body2, { color: colors.text, marginLeft: spacing.xs + 2, flex: 1, fontWeight: '600' }]}>
          Social Notes: See what friends are thinking & listening to
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 3. Feed Filters */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveFilter('all')}
          style={[
            styles.filterTab,
            activeFilter === 'all' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              styles.filterTabText,
              {
                color: activeFilter === 'all' ? colors.text : colors.textMuted,
                fontWeight: activeFilter === 'all' ? '800' : '600',
              },
            ]}
          >
            All Posts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('following')}
          style={[
            styles.filterTab,
            activeFilter === 'following' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              styles.filterTabText,
              {
                color: activeFilter === 'following' ? colors.text : colors.textMuted,
                fontWeight: activeFilter === 'following' ? '800' : '600',
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
      <Header title="Community" />

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
        contentContainerStyle={styles.listContent}
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
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
              </View>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                Welcome to Community
              </Text>
              <Text
                style={[
                  typography.body2,
                  { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 280 },
                ]}
              >
                Follow creators, share your favorite moments, or tap + to create your first post!
              </Text>
            </View>
          ) : undefined
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
  feedHeaderWrapper: {
    marginBottom: spacing.sm,
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
    marginHorizontal: spacing.sm + 4,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    marginTop: spacing.xs,
  },
  filterTab: {
    paddingVertical: 10,
    marginRight: spacing.lg,
  },
  filterTabText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
