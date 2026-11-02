import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Avatar } from '../Avatar';
import { AnimatedLikeButton } from '../common/AnimatedLikeButton';
import { useFeedStore } from '../../store/useFeedStore';
import { spacing, typography } from '../../theme/spacing';
import { ReelSummary } from '@infernux/shared';
import { useNativeDriver } from '../../utils/animationHelper';

interface ReelVideoItemProps {
  item: ReelSummary;
  index: number;
  isActive: boolean;
  reelHeight: number;
  reelWidth: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reel: ReelSummary) => void;
  onOpenOptions: (reel: ReelSummary) => void;
  onOpenMusic: () => void;
  isAppActive: boolean;
}

export const ReelVideoItem: React.FC<ReelVideoItemProps> = ({
  item,
  index,
  isActive,
  reelHeight,
  reelWidth,
  isMuted,
  onToggleMute,
  onOpenComments,
  onOpenShare,
  onOpenOptions,
  onOpenMusic,
  isAppActive,
}) => {
  const router = useRouter();
  const { likeReel, saveReel, recordReelView, toggleFollowCreator, activeReelIndex } = useFeedStore();

  const [paused, setPaused] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showPlayPauseBadge, setShowPlayPauseBadge] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Animation values
  const heartScaleAnim = useRef(new Animated.Value(0)).current;
  const heartOpacityAnim = useRef(new Animated.Value(0)).current;
  const playBadgeAnim = useRef(new Animated.Value(0)).current;
  const discSpinAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;

  // Double tap detection
  const lastTapRef = useRef<number>(0);
  const viewTimerRef = useRef<any>(null);

  // Preload rule: only mount VideoView for active and adjacent (±1) items
  const shouldMountPlayer = Math.abs(index - activeReelIndex) <= 1;

  // Video Player initialization
  const player = useVideoPlayer(item.videoUrl, (p) => {
    p.loop = true;
    p.muted = Platform.OS === 'web' ? true : isMuted;
    if (isActive && isAppActive && !paused) {
      try {
        const res = (p as any).play();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Safe catch for autoplay constraints
      }
    }
  });

  // Keep mute state in sync
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  // Handle Play/Pause based on visibility & app state
  useEffect(() => {
    if (!player) return;

    if (isActive && isAppActive && !paused) {
      setPlaybackError(false);
      try {
        const res = (player as any).play();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {
        // Safe catch for autoplay constraints
      }

      // Record view after 1.5 seconds of active watch time
      if (!viewTimerRef.current) {
        viewTimerRef.current = setTimeout(() => {
          recordReelView(item.id);
        }, 1500);
      }
    } else {
      try {
        player.pause();
      } catch {
        // ignore
      }
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    }

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [isActive, isAppActive, paused, player, item.id]);

  // Continuous spinning vinyl disc animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isActive && !paused) {
      animation = Animated.loop(
        Animated.timing(discSpinAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver,
        })
      );
      animation.start();
    } else {
      discSpinAnim.stopAnimation();
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [isActive, paused]);

  // Tap handler: single tap = toggle pause/play; double tap = Instagram heart burst!
  const handleTouch = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap!
      handleDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        // If not double tapped, trigger play/pause
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
          handleTogglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleTogglePlayPause = () => {
    const nextPaused = !paused;
    setPaused(nextPaused);

    // Show temporary play/pause badge in center
    setShowPlayPauseBadge(true);
    playBadgeAnim.setValue(1);
    Animated.timing(playBadgeAnim, {
      toValue: 0,
      duration: 650,
      useNativeDriver,
    }).start(() => setShowPlayPauseBadge(false));
  };

  const handleDoubleTapLike = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }

    if (!item.isLiked) {
      likeReel(item.id);
    }

    // Trigger Heart Burst Animation
    setShowHeartAnim(true);
    heartScaleAnim.setValue(0);
    heartOpacityAnim.setValue(1);

    Animated.parallel([
      Animated.spring(heartScaleAnim, {
        toValue: 1.25,
        friction: 3,
        useNativeDriver,
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(heartOpacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver,
        }),
      ]),
    ]).start(() => {
      setShowHeartAnim(false);
    });
  };

  const handleLikeBtnPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    // Button bouncy animation
    likeScaleAnim.setValue(0.7);
    Animated.spring(likeScaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver,
    }).start();

    likeReel(item.id);
  };

  const spinInterpolate = discSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return `${count}`;
  };

  return (
    <View style={[styles.container, { width: reelWidth, height: reelHeight }]}>
      {/* 1. Fullscreen Video Surface */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTouch}
        style={StyleSheet.absoluteFill}
      >
        {shouldMountPlayer ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: item.thumbnailUrl || item.videoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Top Gradient for header readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'transparent']}
          style={styles.topGradient}
          pointerEvents="none"
        />

        {/* Bottom Gradient for creator details & actions readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />

        {/* Play/Pause Centered Badge Animation */}
        {showPlayPauseBadge && (
          <Animated.View
            style={[
              styles.centeredBadge,
              {
                opacity: playBadgeAnim,
                transform: [
                  {
                    scale: playBadgeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.badgeCircle}>
              <Ionicons
                name={paused ? 'pause' : 'play'}
                size={44}
                color="rgba(255,255,255,0.95)"
                style={{ marginLeft: paused ? 0 : 4 }}
              />
            </View>
          </Animated.View>
        )}

        {/* Double-Tap Heart Burst Animation */}
        {showHeartAnim && (
          <View style={styles.centeredHeartContainer} pointerEvents="none">
            <Animated.View
              style={{
                transform: [{ scale: heartScaleAnim }],
                opacity: heartOpacityAnim,
              }}
            >
              <Ionicons name="heart" size={110} color="#FF2E63" />
            </Animated.View>
          </View>
        )}

        {/* Retry Overlay if Playback Fails */}
        {playbackError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF4565" />
            <Text style={styles.errorText}>Video failed to load</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setPlaybackError(false);
                player.play();
              }}
            >
              <Text style={styles.retryBtnText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Floating Volume / Mute Button */}
      <TouchableOpacity
        onPress={onToggleMute}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.volumePill}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* 2. Right-Side Action Panel (Instagram Style) */}
      <View style={styles.rightActionsPanel}>
        {/* Creator Avatar & Quick Follow Badge */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/search` as any)}
          >
            <Avatar
              url={item.creator.avatarUrl}
              name={item.creator.displayName}
              size={48}
              isVerified={item.creator.isVerified}
            />
          </TouchableOpacity>
          {!item.isFollowingCreator && (
            <TouchableOpacity
              style={styles.followBadge}
              onPress={() => toggleFollowCreator(item.creatorId)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="add" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Like Button with Bouncy Spring Scale & Animated Count */}
        <View style={styles.actionItem}>
          <AnimatedLikeButton
            isLiked={item.isLiked}
            likesCount={item.likesCount}
            onPress={handleLikeBtnPress}
            size={34}
            showCount={true}
            countPosition="below"
            colorActive="#FF2E63"
            colorInactive="#FFFFFF"
          />
        </View>

        {/* Comment Button */}
        <TouchableOpacity
          style={styles.actionItem}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => onOpenComments(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={30} color="#FFFFFF" />
          <Text style={styles.actionCount}>{formatCount(item.commentsCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.actionItem}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => onOpenShare(item)}
        >
          <Ionicons name="paper-plane-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionCount}>
            {item.sharesCount > 0 ? formatCount(item.sharesCount) : 'Share'}
          </Text>
        </TouchableOpacity>

        {/* Save / Bookmark Button */}
        <TouchableOpacity
          style={styles.actionItem}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => saveReel(item.id)}
        >
          <Ionicons
            name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={item.isSaved ? '#6366F1' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* More Options Button */}
        <TouchableOpacity
          style={styles.actionItem}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => onOpenOptions(item)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* 360° Spinning Vinyl Audio Disc */}
        <TouchableOpacity
          style={styles.discButton}
          onPress={onOpenMusic}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Animated.View
            style={[
              styles.discBody,
              { transform: [{ rotate: spinInterpolate }] },
            ]}
          >
            <View style={styles.discCenter}>
              <Ionicons name="musical-note" size={14} color="#FFFFFF" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 3. Bottom-Left Creator Information (Instagram Style) */}
      <View style={styles.bottomDetailsOverlay}>
        {/* Creator Name & Follow Button Row */}
        <View style={styles.creatorRow}>
          <TouchableOpacity
            style={styles.usernamePill}
            onPress={() => router.push('/search' as any)}
          >
            <Text style={styles.creatorUsername}>@{item.creator.username}</Text>
            {item.creator.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#38BDF8"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>

          {!item.isFollowingCreator && (
            <TouchableOpacity
              style={styles.inlineFollowBtn}
              onPress={() => toggleFollowCreator(item.creatorId)}
            >
              <Text style={styles.inlineFollowText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Caption with Expandable "... more" */}
        {item.caption ? (
          <View style={styles.captionContainer}>
            <Text
              numberOfLines={isCaptionExpanded ? undefined : 2}
              style={styles.captionText}
            >
              {item.caption}
            </Text>
            {item.caption.length > 80 && (
              <TouchableOpacity
                onPress={() => setIsCaptionExpanded(!isCaptionExpanded)}
                style={styles.expandCaptionBtn}
              >
                <Text style={styles.expandCaptionText}>
                  {isCaptionExpanded ? 'less' : '... more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Hashtags Chips */}
        {item.hashtags && item.hashtags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            {item.hashtags.map((tag) => (
              <Text key={tag} style={styles.hashtagItem}>
                #{tag}{' '}
              </Text>
            ))}
          </View>
        )}

        {/* Audio Attribution Marquee Row */}
        <TouchableOpacity style={styles.audioRow} onPress={onOpenMusic}>
          <Ionicons name="musical-notes" size={13} color="#FFFFFF" />
          <Text numberOfLines={1} style={styles.audioTitle}>
            {item.audio?.title
              ? `${item.audio.title} • ${item.audio.artist || item.creator.displayName}`
              : `Original audio - @${item.creator.username}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  centeredBadge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  centeredHeartContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  volumePill: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rightActionsPanel: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    alignItems: 'center',
    zIndex: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
  },
  followBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#EC4899',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 18,
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  discButton: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111116',
    borderWidth: 2,
    borderColor: '#33333F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discCenter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDetailsOverlay: {
    position: 'absolute',
    left: 14,
    bottom: 24,
    right: 80,
    zIndex: 30,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  usernamePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorUsername: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  inlineFollowBtn: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  inlineFollowText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  captionContainer: {
    marginBottom: 6,
  },
  captionText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13.5,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  expandCaptionBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  expandCaptionText: {
    color: '#D1D5DB',
    fontWeight: '700',
    fontSize: 12.5,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  hashtagItem: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 13,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  audioTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
});
