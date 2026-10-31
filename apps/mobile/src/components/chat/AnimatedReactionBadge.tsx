import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MessageReaction } from '@infernux/shared';
import { useThemeStore } from '../../store/useThemeStore';
import { typography } from '../../theme/spacing';

interface AnimatedReactionBadgeProps {
  reactions: MessageReaction[];
  isSender: boolean;
  onPress?: () => void;
}

export const AnimatedReactionBadge: React.FC<AnimatedReactionBadgeProps> = ({
  reactions,
  isSender,
  onPress,
}) => {
  const { colors } = useThemeStore();
  const prevCountRef = useRef(reactions.length);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countScaleAnim = useRef(new Animated.Value(1)).current;

  const uniqueEmojis = Array.from(new Set(reactions.map((r) => r.emoji)));
  const count = reactions.length;

  useEffect(() => {
    // When count increases or changes, trigger a spring bounce
    if (reactions.length !== prevCountRef.current) {
      prevCountRef.current = reactions.length;

      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.25,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(countScaleAnim, {
            toValue: 0.8,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(countScaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [reactions.length]);

  if (!reactions || reactions.length === 0) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.container,
        isSender ? styles.containerSender : styles.containerReceiver,
      ]}
    >
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: isSender
              ? 'rgba(0, 0, 0, 0.45)'
              : colors.surfaceElevated,
            borderColor: colors.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.emojisRow}>
          {uniqueEmojis.map((emoji, idx) => (
            <Text key={idx} style={styles.emojiText}>
              {emoji}
            </Text>
          ))}
        </View>
        <Animated.View style={{ transform: [{ scale: countScaleAnim }] }}>
          <Text
            style={[
              typography.caption,
              styles.countText,
              { color: isSender ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {count}
          </Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface AnimatedReactionButtonProps {
  emoji: string;
  onSelect: (emoji: string) => void;
}

export const AnimatedReactionButton: React.FC<AnimatedReactionButtonProps> = ({
  emoji,
  onSelect,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }

    // Spring expansion & float up effect on selection
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.45,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -14,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onSelect(emoji);
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.reactionBtn}
    >
      <Animated.Text
        style={[
          styles.pickerEmoji,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: floatAnim },
            ],
          },
        ]}
      >
        {emoji}
      </Animated.Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  containerSender: {
    alignSelf: 'flex-end',
  },
  containerReceiver: {
    alignSelf: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  emojisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  emojiText: {
    fontSize: 13,
    marginRight: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reactionBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmoji: {
    fontSize: 28,
  },
});
