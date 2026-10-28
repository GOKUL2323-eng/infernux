import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';

export const MiniMusicPlayer: React.FC = () => {
  const { currentTrack, isPlaying, isMiniPlayerVisible, togglePlayPause, nextTrack, closeMiniPlayer } =
    useMusicStore();
  const { colors } = useThemeStore();

  if (!isMiniPlayerVisible || !currentTrack) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Image source={{ uri: currentTrack.coverUrl }} style={styles.cover} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={[typography.body2, { color: colors.text, fontWeight: '700' }]}>
          {currentTrack.title}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
          {currentTrack.artist}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlayPause} style={styles.controlBtn}>
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={36}
            color={colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextTrack} style={styles.controlBtn}>
          <Ionicons name="play-forward" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={closeMiniPlayer} style={styles.controlBtn}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Above bottom tab bar
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  info: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    paddingHorizontal: spacing.xs,
  },
});

