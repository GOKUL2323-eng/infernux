import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ReelVideoItem } from '../../src/components/reels/ReelVideoItem';
import { ReelsTopNav } from '../../src/components/reels/ReelsTopNav';
import { ReelsCommentsSheet } from '../../src/components/reels/ReelsCommentsSheet';
import { ReelsShareSheet } from '../../src/components/reels/ReelsShareSheet';
import { ReelsOptionsSheet } from '../../src/components/reels/ReelsOptionsSheet';
import { ReelUploadModal } from '../../src/components/reels/ReelUploadModal';
import { spacing, typography } from '../../src/theme/spacing';
import { ReelSummary } from '@infernux/shared';

export default function ReelsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const {
    reels,
    loadReels,
    isLoadingReels,
    activeReelIndex,
    setActiveReelIndex,
    reelFeedType,
    setReelFeedType,
  } = useFeedStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [commentsReelId, setCommentsReelId] = useState<string | null>(null);
  const [shareReel, setShareReel] = useState<ReelSummary | null>(null);
  const [optionsReel, setOptionsReel] = useState<ReelSummary | null>(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  // Dynamic reel height: video spans from y=0 (behind transparent top nav) to bottom tab bar
  const bottomTabBarHeight = 56 + (insets.bottom > 0 ? insets.bottom : 8);
  const reelHeight = height - bottomTabBarHeight;

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadReels();
    }
  }, [isAuthenticated, user?.id]);

  // AppState listener to pause playback when app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
    }
  }).current;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReels(true);
    setRefreshing(false);
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleOpenComments = useCallback((reelId: string) => {
    setCommentsReelId(reelId);
  }, []);

  const handleOpenShare = useCallback((reel: ReelSummary) => {
    setShareReel(reel);
  }, []);

  const handleOpenOptions = useCallback((reel: ReelSummary) => {
    setOptionsReel(reel);
  }, []);

  const handleOpenMusic = useCallback(() => {
    router.push('/music' as any);
  }, [router]);

  const renderReelItem = useCallback(
    ({ item, index }: { item: ReelSummary; index: number }) => {
      const isActive = index === activeReelIndex;

      return (
        <ReelVideoItem
          item={item}
          index={index}
          isActive={isActive}
          reelHeight={reelHeight}
          reelWidth={width}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenComments={handleOpenComments}
          onOpenShare={handleOpenShare}
          onOpenOptions={handleOpenOptions}
          onOpenMusic={handleOpenMusic}
          isAppActive={isAppActive}
        />
      );
    },
    [
      activeReelIndex,
      reelHeight,
      width,
      isMuted,
      handleToggleMute,
      handleOpenComments,
      handleOpenShare,
      handleOpenOptions,
      handleOpenMusic,
      isAppActive,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar style="light" />

      {/* Transparent Top Navigation Overlay (Instagram Style) */}
      <ReelsTopNav
        onOpenCreateReel={() => setIsUploadModalVisible(true)}
        onOpenSearch={() => router.push('/search' as any)}
      />

      {/* Fullscreen Vertical Swipe FlatList */}
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={renderReelItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={reelHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 65 }}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
            colors={['#6366F1']}
            progressViewOffset={insets.top + 50}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { height: reelHeight, width }]}>
            <Ionicons name="videocam-outline" size={68} color="#555" />
            <Text style={[typography.h3, styles.emptyTitle]}>
              {reelFeedType === 'following' ? 'No Following Reels' : 'No Reels Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {reelFeedType === 'following'
                ? "Follow more creators to see their vertical videos here, or switch to 'For You'."
                : 'Be the first to create and share a vertical video with the world!'}
            </Text>

            <View style={styles.emptyActionsRow}>
              {reelFeedType === 'following' ? (
                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={() => setReelFeedType('for_you')}
                >
                  <Text style={styles.emptyPrimaryBtnText}>Explore For You</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.emptyPrimaryBtn, { backgroundColor: '#6366F1' }]}
                onPress={() => setIsUploadModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyPrimaryBtnText}>Create Reel</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Instagram-Style Comment Bottom Sheet */}
      {commentsReelId && (
        <ReelsCommentsSheet
          visible={!!commentsReelId}
          reelId={commentsReelId}
          onClose={() => setCommentsReelId(null)}
          onCommentAdded={() => loadReels()}
        />
      )}

      {/* Instagram-Style Share Bottom Sheet */}
      {shareReel && (
        <ReelsShareSheet
          visible={!!shareReel}
          reel={shareReel}
          onClose={() => setShareReel(null)}
        />
      )}

      {/* Reels Options Sheet */}
      {optionsReel && (
        <ReelsOptionsSheet
          visible={!!optionsReel}
          reel={optionsReel}
          onClose={() => setOptionsReel(null)}
          onNotInterested={(id) => {
            // Remove from local feed
            useFeedStore.setState((state) => ({
              reels: state.reels.filter((r) => r.id !== id),
            }));
          }}
        />
      )}

      {/* 8-Step Instagram-Inspired Reel Upload Modal */}
      <ReelUploadModal
        visible={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
        onPublished={() => loadReels(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: '#0D0D14',
  },
  emptyTitle: {
    color: '#FFFFFF',
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 13.5,
    lineHeight: 20,
    maxWidth: 290,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.lg,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262638',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3D3D52',
  },
  emptyPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
});
