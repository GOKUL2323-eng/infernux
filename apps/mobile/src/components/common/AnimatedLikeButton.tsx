import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../store/useThemeStore';
import { typography } from '../../theme/spacing';

interface AnimatedLikeButtonProps {
  isLiked: boolean;
  likesCount?: number;
  onPress: () => void;
  size?: number;
  showCount?: boolean;
  countPosition?: 'right' | 'below';
  colorActive?: string;
  colorInactive?: string;
  hitSlop?: any;
}

export const AnimatedLikeButton: React.FC<AnimatedLikeButtonProps> = ({
  isLiked,
  likesCount,
  onPress,
  size = 26,
  showCount = false,
  countPosition = 'right',
  colorActive = '#EF4444',
  colorInactive,
  hitSlop = { top: 8, bottom: 8, left: 6, right: 6 },
}) => {
  const { colors } = useThemeStore();
  const iconScale = useRef(new Animated.Value(1)).current;
  const countScale = useRef(new Animated.Value(1)).current;
  const isPendingRef = useRef(false);

  const prevLikedRef = useRef(isLiked);

  useEffect(() => {
    // When like state toggles
    if (isLiked !== prevLikedRef.current) {
      prevLikedRef.current = isLiked;

      if (isLiked) {
        // Liking spring bounce
        Animated.sequence([
          Animated.timing(iconScale, {
            toValue: 0.7,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1.3,
            friction: 3,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();

        // Count bounce
        Animated.sequence([
          Animated.timing(countScale, {
            toValue: 0.8,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(countScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Unliking subtle transition
        Animated.sequence([
          Animated.timing(iconScale, {
            toValue: 0.88,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.spring(iconScale, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [isLiked]);

  const handlePress = () => {
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setTimeout(() => {
      isPendingRef.current = false;
    }, 280);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    onPress();
  };

  const activeColor = colorActive;
  const inactiveColor = colorInactive || colors.text;

  const formatCount = (count?: number) => {
    if (count === undefined) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return `${count}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      hitSlop={hitSlop}
      style={[
        styles.container,
        countPosition === 'below' && styles.containerColumn,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? activeColor : inactiveColor}
        />
      </Animated.View>

      {showCount && likesCount !== undefined && (
        <Animated.View
          style={[
            styles.countWrapper,
            countPosition === 'below' ? styles.countBelow : styles.countRight,
            { transform: [{ scale: countScale }] },
          ]}
        >
          <Text
            style={[
              typography.caption,
              styles.countText,
              { color: isLiked ? activeColor : inactiveColor },
            ]}
          >
            {formatCount(likesCount)}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerColumn: {
    flexDirection: 'column',
  },
  countWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRight: {
    marginLeft: 5,
  },
  countBelow: {
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
