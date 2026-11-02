import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';
import { useNativeDriver } from '../../utils/animationHelper';

interface AnimatedMessageBubbleProps {
  children: React.ReactNode;
  isSender: boolean;
  isNew?: boolean;
  style?: ViewStyle | (ViewStyle | false | undefined)[];
}

// Global registry of animated message IDs within current session so entrance runs at most once
const animatedMessageIds = new Set<string>();

export const markMessageAsAnimated = (messageId: string) => {
  animatedMessageIds.add(messageId);
};

export const hasMessageAnimated = (messageId: string): boolean => {
  return animatedMessageIds.has(messageId);
};

export const AnimatedMessageBubble: React.FC<AnimatedMessageBubbleProps> = ({
  children,
  isSender,
  isNew = false,
  style,
}) => {
  // If not a brand-new message, initialize values directly at resting state (1, 0)
  const opacityAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateAnim = useRef(new Animated.Value(isNew ? (isSender ? 12 : -16) : 0)).current;
  const scaleAnim = useRef(new Animated.Value(isNew ? (isSender ? 0.92 : 0.96) : 1)).current;

  useEffect(() => {
    if (!isNew) return;

    if (isSender) {
      // Outgoing message: subtle scale-up + gentle vertical/horizontal slide + fade
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]).start();
    } else {
      // Incoming message: smooth slide in from left + subtle fade
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver,
        }),
      ]).start();
    }
  }, [isNew, isSender]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [
            isSender
              ? { translateY: translateAnim }
              : { translateX: translateAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

