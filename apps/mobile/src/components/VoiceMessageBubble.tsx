import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  isSender: boolean;
}

const DEFAULT_BAR_HEIGHTS = [
  8, 14, 22, 16, 28, 18, 12, 24, 30, 20, 14, 26, 18, 10, 22, 16, 28, 14, 20, 12, 18, 10,
];

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  audioUrl,
  duration = 0,
  isSender,
}) => {
  const { colors } = useThemeStore();
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSeconds, setPositionSeconds] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);

  // Animation values
  const playBtnScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const activeBarPulse = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    // Pulse animation for the active playback bar
    if (isPlaying) {
      activeBarPulse.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      activeBarPulse.current.start();
    } else {
      if (activeBarPulse.current) {
        activeBarPulse.current.stop();
      }
      pulseAnim.setValue(1);
    }

    return () => {
      if (activeBarPulse.current) {
        activeBarPulse.current.stop();
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.remove();
        } catch {
          // ignore
        }
      }
    };
  }, [player]);

  const togglePlayback = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    // Button spring animation
    Animated.sequence([
      Animated.timing(playBtnScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(playBtnScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (!player) {
        const newPlayer = createAudioPlayer(audioUrl);
        newPlayer.play();
        setPlayer(newPlayer);
        setIsPlaying(true);

        newPlayer.addListener('playbackStatusUpdate', (status) => {
          const currentPos = Math.round(status.currentTime || 0);
          setPositionSeconds(currentPos);
          setIsPlaying(status.playing);

          if (status.duration && status.duration > 0 && totalDuration === 0) {
            setTotalDuration(Math.round(status.duration));
          }

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionSeconds(0);
          }
        });
      } else {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
        } else {
          player.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.warn('Voice message playback error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate playback percentage and current bar index
  const playbackPercent = totalDuration > 0 ? positionSeconds / totalDuration : 0;
  const activeBarIndex = Math.floor(playbackPercent * DEFAULT_BAR_HEIGHTS.length);

  return (
    <View style={styles.container}>
      {/* Animated Play/Pause Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={togglePlayback}
        style={styles.playBtnTouch}
      >
        <Animated.View
          style={[
            styles.playBtn,
            {
              backgroundColor: isSender ? '#FFFFFF' : colors.primary,
              transform: [{ scale: playBtnScale }],
            },
          ]}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color={isSender ? colors.primary : '#FFFFFF'}
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Dynamic Animated Waveform */}
      <View style={styles.waveformContainer}>
        <View style={styles.waveformRow}>
          {DEFAULT_BAR_HEIGHTS.map((height, i) => {
            const hasPlayed = i <= activeBarIndex && (isPlaying || positionSeconds > 0);
            const isCurrentlyPlayingBar = i === activeBarIndex && isPlaying;

            const playedColor = isSender ? '#FFFFFF' : colors.primary;
            const unplayedColor = isSender
              ? 'rgba(255, 255, 255, 0.45)'
              : 'rgba(150, 150, 150, 0.45)';

            return (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: hasPlayed ? playedColor : unplayedColor,
                    transform: isCurrentlyPlayingBar
                      ? [{ scaleY: pulseAnim }]
                      : [{ scaleY: 1 }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Progress Time & Duration */}
        <View style={styles.timeRow}>
          <Text
            style={[
              typography.caption,
              styles.timeText,
              { color: isSender ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
            ]}
          >
            {formatDuration(isPlaying ? positionSeconds : totalDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 190,
    maxWidth: 240,
  },
  playBtnTouch: {
    marginRight: spacing.sm,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  timeRow: {
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
