import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../../store/useThemeStore';
import { useNativeDriver } from '../../utils/animationHelper';

interface AnimatedTabBarButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
  style?: any;
}

export const AnimatedTabBarButton: React.FC<AnimatedTabBarButtonProps> = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  style,
}) => {
  const { colors } = useThemeStore();
  const focused = accessibilityState?.selected === true;

  // Animation values for scale, press feedback, and active highlight indicator
  const focusScaleAnim = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    // Spring scaling for active vs inactive tab
    Animated.parallel([
      Animated.spring(focusScaleAnim, {
        toValue: focused ? 1.1 : 1,
        friction: 5,
        tension: 100,
        useNativeDriver,
      }),
      Animated.spring(indicatorAnim, {
        toValue: focused ? 1 : 0,
        friction: 6,
        tension: 80,
        useNativeDriver,
      }),
    ]).start();
  }, [focused]);

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.9,
      friction: 6,
      tension: 120,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver,
    }).start();
  };

  const handlePress = (e: GestureResponderEvent) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on web/unsupported devices
    }
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.buttonContainer, style]}
    >
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            transform: [
              { scale: focusScaleAnim },
              { scale: pressScaleAnim },
            ],
          },
        ]}
      >
        {children}

        {/* Smooth active tab pill/dot highlight */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: colors.primary,
              opacity: indicatorAnim,
              transform: [{ scaleX: indicatorAnim }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 14,
    height: 3,
    borderRadius: 2,
  },
});

