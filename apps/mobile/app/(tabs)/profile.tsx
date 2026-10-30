import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { UserListModal } from '../../src/components/UserListModal';
import { CommentsModal } from '../../src/components/CommentsModal';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { PostSummary, ReelSummary } from '@infernux/shared';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

type ProfileTab = 'posts' | 'reels' | 'saved';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [userPosts, setUserPosts] = useState<PostSummary[]>([]);
  const [userReels, setUserReels] = useState<ReelSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [userListModalConfig, setUserListModalConfig] = useState<{
    visible: boolean;
    type: 'followers' | 'following';
    title: string;
  }>({ visible: false, type: 'followers', title: 'Followers' });
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserContent();
    }
  }, [user]);

  const fetchUserContent = async () => {
    if (!user) return;
    const [postsRes, reelsRes] = await Promise.all([
      api.get<PostSummary[]>(`/posts/user/${user.id}`),
      api.get<ReelSummary[]>(`/reels/user/${user.id}`),
    ]);

    if (postsRes.success && postsRes.data) setUserPosts(postsRes.data);
    if (reelsRes.success && reelsRes.data) setUserReels(reelsRes.data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserContent();
    setRefreshing(false);
  };

  const openFollowers = () => {
    if (!user) return;
    setUserListModalConfig({
      visible: true,
      type: 'followers',
      title: 'Followers',
    });
  };

  const openFollowing = () => {
    if (!user) return;
    setUserListModalConfig({
      visible: true,
      type: 'following',
      title: 'Following',
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.text }]}>
          @{user?.username || 'profile'}
        </Text>
        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/notes/private' as any)}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/music' as any)}
          >
            <Ionicons name="musical-notes-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Cover Image */}
        {user?.coverImageUrl ? (
          <Image source={{ uri: user.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: colors.surfaceElevated }]} />
        )}

        {/* Profile Info Row */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarWrapper, { borderColor: colors.background }]}>
            <Avatar url={user?.avatarUrl} name={user?.displayName} size={84} isVerified={user?.isVerified} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[typography.h3, { color: colors.text }]}>{userPosts.length}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Posts</Text>
            </View>

            <TouchableOpacity onPress={openFollowers} style={styles.statItem}>
              <Text style={[typography.h3, { color: colors.text }]}>{user?.followersCount || 0}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={openFollowing} style={styles.statItem}>
              <Text style={[typography.h3, { color: colors.text }]}>{user?.followingCount || 0}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Display Name & Bio */}
        <View style={styles.bioSection}>
          <Text style={[typography.body1, { color: colors.text, fontWeight: '700' }]}>
            {user?.displayName}
          </Text>
          {user?.bio ? (
            <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 4 }]}>
              {user.bio}
            </Text>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => setIsEditProfileVisible(true)}
            style={[styles.editBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={[typography.button, { color: colors.text, fontSize: 13 }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/room/create' as any)}
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="key" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={[typography.button, { color: '#FFFFFF', fontSize: 13 }]}>
              New Room
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Icons Row */}
        <View style={[styles.tabIconsRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[
              styles.tabIconBtn,
              activeTab === 'posts' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Ionicons
              name={activeTab === 'posts' ? 'grid' : 'grid-outline'}
              size={22}
              color={activeTab === 'posts' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('reels')}
            style={[
              styles.tabIconBtn,
              activeTab === 'reels' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Ionicons
              name={activeTab === 'reels' ? 'play-circle' : 'play-circle-outline'}
              size={24}
              color={activeTab === 'reels' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('saved')}
            style={[
              styles.tabIconBtn,
              activeTab === 'saved' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={activeTab === 'saved' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Grid Display */}
        {activeTab === 'posts' ? (
          <View style={styles.grid}>
            {userPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.gridCell}
                onPress={() => setSelectedPostIdForComments(post.id)}
              >
                <Image
                  source={{ uri: post.media[0]?.url }}
                  style={[styles.gridImage, { backgroundColor: colors.surfaceElevated }]}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : activeTab === 'reels' ? (
          <View style={styles.grid}>
            {userReels.map((reel) => (
              <TouchableOpacity
                key={reel.id}
                style={styles.gridCell}
                onPress={() => router.push('/(tabs)/reels' as any)}
              >
                <Image
                  source={{ uri: reel.thumbnailUrl }}
                  style={[styles.gridImage, { backgroundColor: colors.surfaceElevated }]}
                />
                <View style={styles.reelOverlay}>
                  <Ionicons name="play" size={14} color="#FFFFFF" />
                  <Text style={styles.reelViews}>{reel.viewsCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {userPosts
              .filter((p) => p.isSaved)
              .map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridCell}
                  onPress={() => setSelectedPostIdForComments(post.id)}
                >
                  <Image
                    source={{ uri: post.media[0]?.url }}
                    style={[styles.gridImage, { backgroundColor: colors.surfaceElevated }]}
                  />
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {isEditProfileVisible && (
        <EditProfileModal
          visible={isEditProfileVisible}
          onClose={() => setIsEditProfileVisible(false)}
          onProfileUpdated={fetchUserContent}
        />
      )}

      {/* User List Modal (Followers / Following) */}
      {userListModalConfig.visible && user && (
        <UserListModal
          visible={userListModalConfig.visible}
          title={userListModalConfig.title}
          userId={user.id}
          type={userListModalConfig.type}
          onClose={() => setUserListModalConfig((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {/* Post Comments Modal */}
      {selectedPostIdForComments && (
        <CommentsModal
          visible={!!selectedPostIdForComments}
          targetType="post"
          targetId={selectedPostIdForComments}
          onClose={() => setSelectedPostIdForComments(null)}
          onCommentAdded={fetchUserContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  coverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  coverFallback: {
    width: '100%',
    height: 120,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: -42,
  },
  avatarWrapper: {
    borderWidth: 3,
    borderRadius: 50,
  },
  statsRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    marginLeft: spacing.lg,
    marginTop: 35,
  },
  statItem: {
    alignItems: 'center',
    padding: spacing.xxs,
  },
  bioSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: borderRadius.md,
  },
  tabIconsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderBottomWidth: 0.5,
  },
  tabIconBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  gridCell: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reelOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  reelViews: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
});
