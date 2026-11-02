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
import { sanitizeVideoUrl, sanitizeMediaUrl } from '../../utils/uploadHelper';

interface ReelVideoItemProps {
  item: ReelSummary;
  index: number;
  isActive: boolean;
  reelHeight: number;
  reelWidth: number;
  bottomTabBarHeight?: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: (reelId: string) => void;
  onOpenShare: (reel: ReelSummary) => void;
  onOpenOptions: (reel: ReelSummary) => void;
  onOpenMusic: () => void;
  isAppActive: boolean;
  isScreenFocused?: boolean;
}

export const ReelVideoItem: React.FC<ReelVideoItemProps> = ({
  item,
  index,
  isActive,
  reelHeight,
  reelWidth,
  bottomTabBarHeight = 64,
  isMuted,
  onToggleMute,
  onOpenComments,
  onOpenShare,
  onOpenOptions,
  onOpenMusic,
  isAppActive,
  isScreenFocused = true,
}) => {
  const router = useRouter();
  const { likeReel, saveReel, recordReelView, toggleFollowCreator, activeReelIndex } = useFeedStore();

  // Playback state variables (synchronized with player)
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showResumeAnim, setShowResumeAnim] = useState(false);

  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  // Animation values
  const heartScaleAnim = useRef(new Animated.Value(0)).current;
  const heartOpacityAnim = useRef(new Animated.Value(0)).current;
  const discSpinAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const playBadgeScale = useRef(new Animated.Value(0.6)).current;
  const playBadgeOpacity = useRef(new Animated.Value(0)).current;
  const resumeBadgeScale = useRef(new Animated.Value(0.7)).current;
  const resumeBadgeOpacity = useRef(new Animated.Value(0)).current;

  // Double tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);
  const viewTimerRef = useRef<any>(null);

  // Preload rule: only mount VideoView for active and adjacent (±1) items
  const shouldMountPlayer = Math.abs(index - activeReelIndex) <= 1;

  // Video Player initialization with safe web fallback
  const safeVideoUrl = sanitizeVideoUrl(item.videoUrl);
  const player = useVideoPlayer(safeVideoUrl, (p) => {
    p.loop = true;
    p.muted = Platform.OS === 'web' ? true : isMuted;
    try {
      p.timeUpdateEventInterval = 0.5;
      p.staysActiveInBackground = false;
    } catch {}
  });

  // Keep mute state in sync
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  // Synchronize playback events from native player
  useEffect(() => {
    if (!player) return;

    let playingSub: any;
    let statusSub: any;
    let timeSub: any;

    try {
      if (typeof player.addListener === 'function') {
        playingSub = player.addListener('playingChange', (event: any) => {
          setIsPlaying(Boolean(event.isPlaying));
        });

        statusSub = player.addListener('statusChange', (event: any) => {
          setIsBuffering(event.status === 'loading');
          if (event.status === 'error') {
            setPlaybackError(true);
          } else if (event.status === 'readyToPlay') {
            setPlaybackError(false);
          }
        });

        timeSub = player.addListener('timeUpdate', (event: any) => {
          if (typeof event?.currentTime === 'number') {
            setCurrentPlaybackPosition(event.currentTime);
          }
          if (player.duration > 0) {
            setVideoDuration(player.duration);
          }
        });
      }
    } catch {}

    return () => {
      try {
        if (playingSub?.remove) playingSub.remove();
        if (statusSub?.remove) statusSub.remove();
        if (timeSub?.remove) timeSub.remove();
      } catch {}
    };
  }, [player]);

  // Reset userPaused when swiping away or entering a new reel
  useEffect(() => {
    if (!isActive) {
      setUserPaused(false);
      setShowResumeAnim(false);
    }
  }, [isActive]);

  // Synchronize play badge animation with paused state (Instagram Style)
  useEffect(() => {
    if (userPaused && isActive) {
      playBadgeScale.setValue(0.6);
      playBadgeOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(playBadgeScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver,
        }),
        Animated.timing(playBadgeOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver,
        }),
      ]).start();
    } else {
      Animated.timing(playBadgeOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver,
      }).start();
    }
  }, [userPaused, isActive]);

  // Orchestrate Play/Pause: only active, focused, active app, not user-paused
  const shouldPlay = isActive && isScreenFocused && isAppActive && !userPaused;

  useEffect(() => {
    if (!player) return;

    if (shouldPlay) {
      setPlaybackError(false);
      try {
        const res = (player as any).play();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch {}

      if (!viewTimerRef.current) {
        viewTimerRef.current = setTimeout(() => {
          recordReelView(item.id);
        }, 1500);
      }
    } else {
      try {
        player.pause();
      } catch {}
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
  }, [shouldPlay, player, item.id]);

  // Continuous spinning vinyl disc animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (shouldPlay) {
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
  }, [shouldPlay]);

  // Tap handler: single tap = toggle pause/play; double tap = Instagram heart burst!
  const handleTouch = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 260;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected: cancel single-tap pause
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      handleDoubleTapLike();
    } else {
      lastTapRef.current = now;
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        lastTapRef.current = 0;
        handleTogglePlayPause();
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleTogglePlayPause = () => {
    if (!player) return;

    const nextPaused = !userPaused;
    setUserPaused(nextPaused);

    try {
      if (nextPaused) {
        player.pause();
      } else {
        const res = (player as any).play();
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
        // Instagram-style brief resume indicator: scale up + smooth fadeout
        setShowResumeAnim(true);
        resumeBadgeScale.setValue(0.7);
        resumeBadgeOpacity.setValue(1);
        Animated.parallel([
          Animated.spring(resumeBadgeScale, {
            toValue: 1.15,
            friction: 5,
            tension: 100,
            useNativeDriver,
          }),
          Animated.sequence([
            Animated.delay(450),
            Animated.timing(resumeBadgeOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished) {
            setShowResumeAnim(false);
          }
        });
      }
    } catch {
      // safe ignore
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
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
        {/* 1. Instant high-res thumbnail behind VideoView so screen is never black */}
        <Image
          source={{ uri: sanitizeMediaUrl(item.thumbnailUrl || item.videoUrl) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* 2. Video Player mounts smoothly over thumbnail */}
        {shouldMountPlayer && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
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

        {/* Buffering Loading Spinner */}
        {isBuffering && isActive && (
          <View style={styles.centeredSpinner} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Play Centered Badge: Visible while video is paused (Instagram Style) */}
        {userPaused && isActive && (
          <View style={styles.centeredBadge} pointerEvents="none">
            <Animated.View
              style={[
                styles.badgeCircle,
                {
                  transform: [{ scale: playBadgeScale }],
                  opacity: playBadgeOpacity,
                },
              ]}
            >
              <Ionicons
                name="play"
                size={48}
                color="#FFFFFF"
                style={{ marginLeft: 6 }}
              />
            </Animated.View>
          </View>
        )}

        {/* Resume Indicator: Briefly flashes pause icon then smoothly fades out */}
        {showResumeAnim && (
          <View style={styles.centeredBadge} pointerEvents="none">
            <Animated.View
              style={[
                styles.badgeCircle,
                {
                  transform: [{ scale: resumeBadgeScale }],
                  opacity: resumeBadgeOpacity,
                },
              ]}
            >
              <Ionicons
                name="pause"
                size={42}
                color="#FFFFFF"
              />
            </Animated.View>
          </View>
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
      <View pointerEvents="box-none" style={[styles.rightActionsPanel, { bottom: bottomTabBarHeight + 16 }]}>
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
            colorActive="#F04BBE"
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
            color={item.isSaved ? '#A020F0' : '#FFFFFF'}
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
      <View pointerEvents="box-none" style={[styles.bottomDetailsOverlay, { bottom: bottomTabBarHeight + 16 }]}>
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
  centeredSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  centeredBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 16,
  },
  badgeCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: '#F04BBE',
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
    borderColor: '#30233B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discCenter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#A020F0',
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
