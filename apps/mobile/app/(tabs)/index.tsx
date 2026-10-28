import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
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
import { spacing, typography, borderRadius } from '../../src/theme/spacing';

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

  useEffect(() => {
    loadFeed();
    loadStories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(true), loadStories()]);
    setRefreshing(false);
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
            onComment={() => {}}
            onSave={() => savePost(item.id)}
            onShare={() => {}}
            onUserPress={() => {}}
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
    marginVertical: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
