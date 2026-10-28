import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { spacing, typography } from '../../src/theme/spacing';
import { ReelSummary } from '@infernux/shared';

const { width, height } = Dimensions.get('window');
const REEL_HEIGHT = height - 110; // Minus tab bar height

export default function ReelsScreen() {
  const { reels, loadReels, likeReel, activeReelIndex, setActiveReelIndex } = useFeedStore();
  const { colors } = useThemeStore();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    loadReels();
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveReelIndex(viewableItems[0].index);
      setPaused(false);
    }
  }).current;

  const renderReelItem = ({ item, index }: { item: ReelSummary; index: number }) => {
    const isActive = index === activeReelIndex;

    return (
      <View style={[styles.reelContainer, { backgroundColor: '#000000' }]}>
        {/* Video Player */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPaused(!paused)}
          style={StyleSheet.absoluteFillObject}
        >
          {isActive ? (
            <Video
              source={{ uri: item.videoUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={!paused}
              isMuted={false}
            />
          ) : (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          )}

          {paused && (
            <View style={styles.pauseOverlay}>
              <Ionicons name="play" size={54} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Right Floating Actions */}
        <View style={styles.rightActions}>
          <View style={styles.creatorAvatarWrapper}>
            <Avatar url={item.creator.avatarUrl} name={item.creator.displayName} size={46} isVerified={item.creator.isVerified} />
            {!item.isFollowingCreator && (
              <View style={[styles.followPlus, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => likeReel(item.id)}>
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color={item.isLiked ? colors.error : '#FFFFFF'}
            />
            <Text style={styles.actionText}>{item.likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{item.commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{item.sharesCount}</Text>
          </TouchableOpacity>

          {/* Audio Spinning Disc */}
          <View style={styles.audioDisc}>
            <Ionicons name="disc" size={26} color="#FFFFFF" />
          </View>
        </View>

        {/* Bottom Details Overlay */}
        <View style={styles.bottomOverlay}>
          <Text style={[typography.body1, styles.creatorName]}>
            @{item.creator.username}
          </Text>
          {item.caption ? (
            <Text numberOfLines={2} style={[typography.body2, styles.captionText]}>
              {item.caption}
            </Text>
          ) : null}

          {item.audio && (
            <View style={styles.audioRow}>
              <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
              <Text numberOfLines={1} style={styles.audioText}>
                {item.audio.title} • {item.audio.artist}
              </Text>
            </View>
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
            <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>
              No Reels Available
            </Text>
            <Text style={[typography.body2, { color: '#999', marginTop: spacing.xs }]}>
              Be the first to publish a Reel!
            </Text>
          </View>
        }
      />
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
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 14,
    bottom: 40,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  audioDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 80,
  },
  creatorName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  captionText: {
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  audioText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyContainer: {
    height: REEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

