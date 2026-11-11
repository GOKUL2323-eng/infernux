import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { UserListModal } from '../../src/components/UserListModal';
import { CommentsModal } from '../../src/components/CommentsModal';
import { api } from '../../src/api/client';
import { sanitizeMediaUrl } from '../../src/utils/uploadHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { PostSummary, ReelSummary, StoryHighlightSummary, PresenceStatusMode, UserProfile } from '@infernux/shared';

type ProfileTab = 'posts' | 'reels' | 'saved';

const PRESENCE_MODES: { mode: PresenceStatusMode; label: string; icon: string }[] = [
  { mode: 'online', label: 'Online', icon: 'radio-button-on' },
  { mode: 'focus', label: 'Focus', icon: 'moon' },
  { mode: 'listening', label: 'Listening', icon: 'musical-notes' },
  { mode: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { mode: 'dnd', label: 'DND', icon: 'notifications-off' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, logout, deleteAccount, updateUser } = useAuthStore();
  const { colors } = useThemeStore();

  const GRID_SPACING = 4;
  const gridItemSize = Math.floor((width - (spacing.md * 2) - (GRID_SPACING * 2)) / 3);

  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [userPosts, setUserPosts] = useState<PostSummary[]>([]);
  const [userReels, setUserReels] = useState<ReelSummary[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlightSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleSelectPresence = async (mode: PresenceStatusMode) => {
    const res = await api.put<UserProfile>('/experiences/presence', {
      statusMode: mode,
      customStatusText: mode === 'focus' ? 'In Focus Mode' : undefined,
      focusDurationMinutes: mode === 'focus' ? 45 : 0,
    });
    if (res.success && res.data) {
      updateUser(res.data);
    }
  };

  // Modals
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [userListModalConfig, setUserListModalConfig] = useState<{
    visible: boolean;
    type: 'followers' | 'following';
    title: string;
  }>({ visible: false, type: 'followers', title: 'Followers' });
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of MOZHI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, posts, rooms, and conversations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            router.replace('/auth/login' as any);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (user) {
      fetchUserContent();
    }
  }, [user]);

  const fetchUserContent = async () => {
    if (!user) return;
    const [postsRes, reelsRes, hlRes] = await Promise.all([
      api.get<PostSummary[]>(`/posts/user/${user.id}`),
      api.get<ReelSummary[]>(`/reels/user/${user.id}`),
      api.get<StoryHighlightSummary[]>(`/stories/highlights/${user.id}`),
    ]);

    if (postsRes.success && postsRes.data) setUserPosts(postsRes.data);
    if (reelsRes.success && reelsRes.data) setUserReels(reelsRes.data);
    if (hlRes.success && hlRes.data) setHighlights(hlRes.data);
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
      {/* 1. Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <View style={styles.usernameRow}>
          <Text numberOfLines={1} style={[typography.h3, styles.usernameText, { color: colors.text }]}>
            @{user?.username || 'profile'}
          </Text>
          {user?.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/notes/private' as any)}
          >
            <Ionicons name="document-text-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/music' as any)}
          >
            <Ionicons name="musical-notes-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={21} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* 2. Cover Banner */}
        <View style={styles.coverWrapper}>
          {user?.coverImageUrl ? (
            <Image
              source={{ uri: sanitizeMediaUrl(user.coverImageUrl) }}
              style={styles.coverImage}
            />
          ) : (
            <LinearGradient
              colors={['#21152B', '#15101D', '#08060D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverFallback}
            />
          )}
        </View>

        {/* 3. Profile Avatar & Stats Header */}
        <View style={styles.profileHeader}>
          {/* Avatar with purple gradient glow ring */}
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGlowRing}
          >
            <View style={[styles.avatarInnerContainer, { backgroundColor: colors.background }]}>
              <Avatar
                url={user?.avatarUrl}
                name={user?.displayName}
                size={82}
                isVerified={user?.isVerified}
              />
            </View>
          </LinearGradient>

          {/* Glassmorphic Stats Container */}
          <View
            style={[
              styles.statsContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[typography.h3, styles.statNumber, { color: colors.text }]}>
                {userPosts.length}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Posts</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity onPress={openFollowers} style={styles.statItem} activeOpacity={0.7}>
              <Text style={[typography.h3, styles.statNumber, { color: colors.text }]}>
                {(user?.followersCount || 0).toLocaleString()}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Followers</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity onPress={openFollowing} style={styles.statItem} activeOpacity={0.7}>
              <Text style={[typography.h3, styles.statNumber, { color: colors.text }]}>
                {(user?.followingCount || 0).toLocaleString()}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Display Name & Bio */}
        <View style={styles.bioSection}>
          <Text style={[typography.body1, styles.displayName, { color: colors.text }]}>
            {user?.displayName || user?.username}
          </Text>
          {user?.bio ? (
            <Text style={[typography.body2, styles.bioText, { color: colors.textSecondary }]}>
              {user.bio}
            </Text>
          ) : null}
          {user?.featuredSongTitle ? (
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
              ♪ {user.featuredSongTitle}
            </Text>
          ) : null}

          {/* Smart Presence Strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {PRESENCE_MODES.map((p) => {
              const active = (user?.statusMode || 'online') === p.mode;
              return (
                <TouchableOpacity
                  key={p.mode}
                  onPress={() => handleSelectPresence(p.mode)}
                  style={[
                    styles.presencePill,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={p.icon as any} size={12} color={active ? '#FFFFFF' : colors.accent} />
                  <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => setIsEditProfileVisible(true)}
            style={[
              styles.editBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text numberOfLines={1} style={[typography.button, { color: colors.text, fontSize: 13 }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/room/create' as any)}
            style={styles.newRoomBtn}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newRoomGradient}
            >
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text numberOfLines={1} style={[typography.button, { color: '#FFFFFF', fontSize: 13 }]}>
                Private Room
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/creator' as any)}
            style={[
              styles.discoverBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="analytics-outline" size={16} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/snap' as any)}
            style={[
              styles.discoverBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/search' as any)}
            style={[
              styles.discoverBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Experience & Community Hub Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightsRow}
        >
          {[
            { label: 'Capsules', icon: 'hourglass-outline', route: '/capsules' },
            { label: 'MoodSpace', icon: 'happy-outline', route: '/moodspace' },
            { label: 'Spaces & Audio', icon: 'planet-outline', route: '/communities' },
            { label: 'Files & Quota', icon: 'folder-open-outline', route: '/files' },
            { label: 'Creator Studio', icon: 'analytics-outline', route: '/creator' },
          ].map((hub) => (
            <TouchableOpacity
              key={hub.route}
              onPress={() => router.push(hub.route as any)}
              style={[styles.hubChip, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name={hub.icon as any} size={14} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{hub.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Story Highlights Row */}
        {highlights.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightsRow}
          >
            {highlights.map((hl) => (
              <TouchableOpacity
                key={hl.id}
                onPress={() => router.push(`/story/${user?.id}` as any)}
                onLongPress={() => {
                  Alert.alert('Delete Highlight', `Remove "${hl.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await api.delete(`/stories/highlights/${hl.id}`);
                        fetchUserContent();
                      },
                    },
                  ]);
                }}
                style={styles.highlightItem}
              >
                <View style={[styles.highlightRing, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                  {hl.coverUrl ? (
                    <Image source={{ uri: sanitizeMediaUrl(hl.coverUrl) }} style={styles.highlightCover} />
                  ) : (
                    <Ionicons name="sparkles" size={20} color={colors.accent} />
                  )}
                </View>
                <Text numberOfLines={1} style={[typography.caption, { color: colors.text, marginTop: 4, maxWidth: 64 }]}>
                  {hl.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 6. Content Segmented Tabs */}
        <View style={[styles.tabIconsRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[
              styles.tabIconBtn,
              activeTab === 'posts' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
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
              activeTab === 'reels' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
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
              activeTab === 'saved' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
            ]}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={activeTab === 'saved' ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* 7. Grid Display */}
        {activeTab === 'posts' ? (
          userPosts.length > 0 ? (
            <View style={styles.grid}>
              {userPosts.map((post) => {
                const imgUrl = post.media && post.media.length > 0 ? sanitizeMediaUrl(post.media[0].url) : '';
                return (
                  <TouchableOpacity
                    key={post.id}
                    style={[
                      styles.gridCell,
                      {
                        width: gridItemSize,
                        height: gridItemSize,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={() => setSelectedPostIdForComments(post.id)}
                  >
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridPlaceholder, { backgroundColor: colors.surface }]}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.tabEmptyContainer}>
              <View style={[styles.tabEmptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="images-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                No posts shared yet
              </Text>
            </View>
          )
        ) : activeTab === 'reels' ? (
          userReels.length > 0 ? (
            <View style={styles.grid}>
              {userReels.map((reel) => {
                const thumb = sanitizeMediaUrl(reel.thumbnailUrl);
                return (
                  <TouchableOpacity
                    key={reel.id}
                    style={[
                      styles.gridCell,
                      {
                        width: gridItemSize,
                        height: gridItemSize * 1.35,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={() => router.push('/(tabs)/reels' as any)}
                  >
                    <Image source={{ uri: thumb }} style={styles.gridImage} />
                    <View style={styles.reelOverlay}>
                      <Ionicons name="play" size={13} color="#FFFFFF" />
                      <Text style={styles.reelViews}>{reel.viewsCount.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.tabEmptyContainer}>
              <View style={[styles.tabEmptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="videocam-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                No reels created yet
              </Text>
            </View>
          )
        ) : (
          userPosts.filter((p) => p.isSaved).length > 0 ? (
            <View style={styles.grid}>
              {userPosts
                .filter((p) => p.isSaved)
                .map((post) => {
                  const imgUrl = post.media && post.media.length > 0 ? sanitizeMediaUrl(post.media[0].url) : '';
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={[
                        styles.gridCell,
                        {
                          width: gridItemSize,
                          height: gridItemSize,
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                      onPress={() => setSelectedPostIdForComments(post.id)}
                    >
                      <Image source={{ uri: imgUrl }} style={styles.gridImage} />
                    </TouchableOpacity>
                  );
                })}
            </View>
          ) : (
            <View style={styles.tabEmptyContainer}>
              <View style={[styles.tabEmptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="bookmark-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                No saved posts
              </Text>
            </View>
          )
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

      {/* Followers / Following List Modal */}
      {userListModalConfig.visible && (
        <UserListModal
          visible={userListModalConfig.visible}
          type={userListModalConfig.type}
          title={userListModalConfig.title}
          userId={user?.id || ''}
          onClose={() => setUserListModalConfig((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {/* Real Comments Modal */}
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
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameText: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: spacing.xs,
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrapper: {
    height: 120,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: -36,
  },
  avatarGlowRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerContainer: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginLeft: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: '800',
    fontSize: 17,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  bioSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm + 4,
  },
  displayName: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  bioText: {
    marginTop: 4,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRoomBtn: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
  },
  newRoomGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderBottomWidth: 1,
  },
  tabIconBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 4,
  },
  gridCell: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 6, 13, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  reelViews: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  tabEmptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  highlightsRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: 14,
  },
  highlightItem: {
    alignItems: 'center',
  },
  highlightRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlightCover: {
    width: '100%',
    height: '100%',
  },
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
});
