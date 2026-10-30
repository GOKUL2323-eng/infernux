import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Alert,
} from 'react-native';

interface ViewToken {
  item: any;
  key: string;
  index: number | null;
  isViewable: boolean;
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { CommentsModal } from '../../src/components/CommentsModal';
import { api } from '../../src/api/client';
import { spacing, typography } from '../../src/theme/spacing';
import { ReelSummary } from '@infernux/shared';

const { width, height } = Dimensions.get('window');
const REEL_HEIGHT = height - 110; // Minus tab bar height

function ReelVideo({
  videoUrl,
  thumbnailUrl,
  isActive,
  paused,
  isMuted,
}: {
  videoUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  paused: boolean;
  isMuted: boolean;
}) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = isMuted;
    if (isActive && !paused) {
      p.play();
    }
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isActive && !paused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, paused, player]);

  if (!isActive) {
    return (
      <Image
        source={{ uri: thumbnailUrl || videoUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    );
  }

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function ReelsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { reels, loadReels, likeReel, saveReel, activeReelIndex, setActiveReelIndex } = useFeedStore();
  const { colors } = useThemeStore();
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [commentsModalReelId, setCommentsModalReelId] = useState<string | null>(null);

  useEffect(() => {
    loadReels();
  }, [user?.id]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
      setPaused(false);
    }
  }).current;

  const handleShareReel = async (reel: ReelSummary) => {
    try {
      const shareUrl = `https://mozhi.app/reel/${reel.id}`;
      await Share.share({
        message: reel.caption ? `${reel.caption}\n${shareUrl}` : `Watch this reel on MOZHI: ${shareUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleReelOptions = (reel: ReelSummary) => {
    Alert.alert('Reel Options', `@${reel.creator.username}`, [
      {
        text: 'Share Reel',
        onPress: () => handleShareReel(reel),
      },
      {
        text: reel.isSaved ? 'Remove from Saved' : 'Save Reel',
        onPress: () => saveReel(reel.id),
      },
      {
        text: 'Report Inappropriate',
        onPress: async () => {
          await api.post('/moderation/reports', {
            targetType: 'reel',
            targetId: reel.id,
            reason: 'Inappropriate or harmful content',
          });
          Alert.alert('Report Received', 'Thank you for keeping MOZHI safe. Our moderation team has been notified.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleFollowToggle = async (creatorId: string, isFollowing?: boolean) => {
    if (isFollowing) {
      await api.delete(`/users/${creatorId}/unfollow`);
    } else {
      await api.post(`/users/${creatorId}/follow`);
    }
    loadReels();
  };

  const renderReelItem = ({ item, index }: { item: ReelSummary; index: number }) => {
    const isActive = index === activeReelIndex;

    return (
      <View style={[styles.reelContainer, { backgroundColor: '#000000' }]}>
        {/* Video Player */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPaused(!paused)}
          style={StyleSheet.absoluteFill}
        >
          <ReelVideo
            videoUrl={item.videoUrl}
            thumbnailUrl={item.thumbnailUrl}
            isActive={isActive}
            paused={paused}
            isMuted={isMuted}
          />

          {paused && (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play" size={54} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Volume Mute Toggle Floating Button */}
        <TouchableOpacity
          onPress={() => setIsMuted(!isMuted)}
          style={styles.volumeBtn}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Right Floating Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.creatorAvatarWrapper}
            onPress={() => handleFollowToggle(item.creatorId, item.isFollowingCreator)}
          >
            <Avatar url={item.creator.avatarUrl} name={item.creator.displayName} size={46} isVerified={item.creator.isVerified} />
            {!item.isFollowingCreator && (
              <View style={[styles.followPlus, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => likeReel(item.id)}>
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color={item.isLiked ? colors.error : '#FFFFFF'}
            />
            <Text style={styles.actionText}>{item.likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCommentsModalReelId(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{item.commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleShareReel(item)}>
            <Ionicons name="paper-plane-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{item.sharesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => saveReel(item.id)}>
            <Ionicons
              name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={28}
              color={item.isSaved ? colors.primary : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleReelOptions(item)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Audio Spinning Disc */}
          <TouchableOpacity
            style={styles.audioDisc}
            onPress={() => router.push('/music' as any)}
          >
            <Ionicons name="disc" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Details Overlay */}
        <View style={styles.bottomOverlay}>
          <TouchableOpacity onPress={() => router.push('/search' as any)}>
            <Text style={[typography.body1, styles.creatorName]}>
              @{item.creator.username}
            </Text>
          </TouchableOpacity>
          {item.caption ? (
            <Text numberOfLines={2} style={[typography.body2, styles.captionText]}>
              {item.caption}
            </Text>
          ) : null}

          {item.audio && (
            <TouchableOpacity
              style={styles.audioRow}
              onPress={() => router.push('/music' as any)}
            >
              <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
              <Text numberOfLines={1} style={styles.audioText}>
                {item.audio.title} • {item.audio.artist}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: '#000000' }]}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={renderReelItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={60} color="#666" />
            <Text style={[typography.h3, { color: '#FFF', marginTop: spacing.md }]}>
              No Reels Found
            </Text>
            <Text style={[typography.body2, { color: '#AAA', textAlign: 'center', marginTop: spacing.xs }]}>
              Tap Create to publish the first vertical video!
            </Text>
          </View>
        }
      />

      {/* Comments Modal for Reels */}
      {commentsModalReelId && (
        <CommentsModal
          visible={!!commentsModalReelId}
          targetType="reel"
          targetId={commentsModalReelId}
          onClose={() => setCommentsModalReelId(null)}
          onCommentAdded={() => loadReels()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reelContainer: {
    width,
    height: REEL_HEIGHT,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  pauseOverlay: {
    position: 'absolute',
    top: '40%',
    left: '45%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 30,
    padding: 10,
  },
  volumeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rightActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: 80,
    alignItems: 'center',
  },
  creatorAvatarWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  followPlus: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  audioDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E1E28',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginTop: spacing.xs,
  },
  bottomOverlay: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    width: width - 80,
  },
  creatorName: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  captionText: {
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    height: REEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
