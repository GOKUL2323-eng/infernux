import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNativeDriver } from '../../utils/animationHelper';

interface DoubleTapLikeOverlayProps {
  children: React.ReactNode;
  isLiked?: boolean;
  onLike: () => void;
  onSingleTap?: () => void;
  style?: any;
}

export const DoubleTapLikeOverlay: React.FC<DoubleTapLikeOverlayProps> = ({
  children,
  isLiked = false,
  onLike,
  onSingleTap,
  style,
}) => {
  const [showHeart, setShowHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<any>(null);

  const triggerHeartBurst = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }

    setShowHeart(true);
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.2,
        friction: 4,
        tension: 80,
        useNativeDriver,
      }),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver,
        }),
      ]),
    ]).start(() => {
      setShowHeart(false);
    });
  };

  const handlePress = (e: GestureResponderEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap confirmed!
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;

      // Trigger like only if not already liked (Instagram style: never unlikes on double-tap)
      if (!isLiked) {
        onLike();
      }
      triggerHeartBurst();
    } else {
      lastTapRef.current = now;
      if (onSingleTap) {
        singleTapTimerRef.current = setTimeout(() => {
          if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
            onSingleTap();
            lastTapRef.current = 0;
          }
        }, DOUBLE_TAP_DELAY);
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        style={StyleSheet.absoluteFill}
      >
        {children}
      </TouchableOpacity>

      {/* Centered Floating Large Heart Animation */}
      {showHeart && (
        <View pointerEvents="none" style={styles.heartOverlay}>
          <Animated.View
            style={[
              styles.heartContainer,
              {
                opacity: heartOpacity,
                transform: [
                  { scale: heartScale },
                  { rotate: '-6deg' },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={96} color="#FFFFFF" />
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F04BBE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
});
