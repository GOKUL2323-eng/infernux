import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from './Avatar';
import { useThemeStore } from '../store/useThemeStore';
import { typography, spacing } from '../theme/spacing';
import { UserSummary } from '@infernux/shared';

interface StoryRingProps {
  user: UserSummary;
  hasUnseenStories: boolean;
  onPress: () => void;
  isCurrentUser?: boolean;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  user,
  hasUnseenStories,
  onPress,
  isCurrentUser,
}) => {
  const { colors } = useThemeStore();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  // 1. Subtle continuous rotation of gradient ring only for unseen stories
  useEffect(() => {
    let loopAnimation: Animated.CompositeAnimation | null = null;
    if (hasUnseenStories) {
      loopAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopAnimation.start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }

    return () => {
      if (loopAnimation) loopAnimation.stop();
    };
  }, [hasUnseenStories]);

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.93,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    onPress();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.ringWrapper,
          { transform: [{ scale: pressScaleAnim }] },
        ]}
      >
        {hasUnseenStories ? (
          <Animated.View
            style={[
              styles.animatedRingContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientRing}
            />
          </Animated.View>
        ) : (
          <View
            style={[
              styles.seenRing,
              { borderColor: isCurrentUser ? colors.border : colors.textMuted },
            ]}
          />
        )}

        {/* Center avatar masked inside inner circle */}
        <View style={[styles.innerCircle, { backgroundColor: colors.background }]}>
          <Avatar url={user.avatarUrl} name={user.displayName} size={58} />
        </View>

        {isCurrentUser && (
          <View style={[styles.plusBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          typography.caption,
          { color: colors.text, marginTop: spacing.xs, textAlign: 'center', width: 72 },
        ]}
      >
        {isCurrentUser ? 'Your Story' : user.username}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ringWrapper: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  animatedRingContainer: {
    position: 'absolute',
    width: 68,
    height: 68,
  },
  gradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  innerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  seenRing: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 3,
  },
});
