import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  isSender: boolean;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  audioUrl,
  duration = 0,
  isSender,
}) => {
  const { colors } = useThemeStore();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const togglePlayback = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPositionMillis(status.positionMillis);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMillis(0);
          }
        }
      });
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={togglePlayback}
        style={[
          styles.playBtn,
          { backgroundColor: isSender ? '#FFFFFF' : colors.primary },
        ]}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color={isSender ? colors.primary : '#FFFFFF'}
        />
      </TouchableOpacity>

      <View style={styles.waveform}>
        {/* Simplified audio bars */}
        {[10, 18, 14, 22, 16, 26, 12, 20, 8, 16, 24, 18, 12].map((height, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: isSender ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
              },
            ]}
          />
        ))}
      </View>

      <Text
        style={[
          typography.caption,
          { color: isSender ? 'rgba(255,255,255,0.8)' : colors.textSecondary, marginLeft: spacing.xs },
        ]}
      >
        {formatDuration(isPlaying ? positionMillis / 1000 : duration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minWidth: 160,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
