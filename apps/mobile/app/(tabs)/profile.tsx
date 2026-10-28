import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
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

      <ScrollView showsVerticalScrollIndicator={false}>
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
            <View style={styles.statItem}>
              <Text style={[typography.h3, { color: colors.text }]}>{user?.followersCount || 0}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[typography.h3, { color: colors.text }]}>{user?.followingCount || 0}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Following</Text>
            </View>
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
            onPress={() => router.push('/settings' as any)}
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
        </View>

        {/* Grid Display */}
        {activeTab === 'posts' ? (
          <View style={styles.grid}>
            {userPosts.map((post) => (
              <View key={post.id} style={styles.gridCell}>
                <Image
                  source={{ uri: post.media[0]?.url }}
                  style={[styles.gridImage, { backgroundColor: colors.surfaceElevated }]}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {userReels.map((reel) => (
              <View key={reel.id} style={styles.gridCell}>
                <Image
                  source={{ uri: reel.thumbnailUrl }}
                  style={[styles.gridImage, { backgroundColor: colors.surfaceElevated }]}
                />
                <View style={styles.reelOverlay}>
                  <Ionicons name="play" size={14} color="#FFFFFF" />
                  <Text style={styles.reelViews}>{reel.viewsCount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    marginLeft: spacing.md,
    padding: spacing.xxs,
  },
  coverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  coverFallback: {
    width: '100%',
    height: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: -40,
  },
  avatarWrapper: {
    borderWidth: 3,
    borderRadius: 45,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: spacing.lg,
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  bioSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
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
  },
  gridCell: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelViews: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});

