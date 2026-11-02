import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../../store/useThemeStore';
import { useNativeDriver } from '../../utils/animationHelper';
import { typography, spacing } from '../../theme/spacing';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

interface SplashScreenViewProps {
  isReady: boolean;
  onAnimationComplete?: () => void;
}

export const SplashScreenView: React.FC<SplashScreenViewProps> = ({
  isReady,
  onAnimationComplete,
}) => {
  const { colors, isDarkMode } = useThemeStore();
  const [isRendered, setIsRendered] = useState(true);
  const hasExitedRef = useRef(false);

  // Animated values
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  const performExit = () => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;

    Animated.timing(containerFade, {
      toValue: 0,
      duration: 350,
      easing: Easing.in(Easing.cubic),
      useNativeDriver,
    }).start(() => {
      setIsRendered(false);
      onAnimationComplete?.();
    });
  };

  useEffect(() => {
    // 1. Entrance sequence: Logo fade in + subtle scale-up + soft glow + name appearance
    Animated.parallel([
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver,
      }),
      Animated.timing(glowOpacity, {
        toValue: isDarkMode ? 0.45 : 0.25,
        duration: 850,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 550,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
        ]),
      ]),
    ]).start();

    // 2. Guaranteed fallback timeout: splash NEVER hangs indefinitely!
    const fallbackTimer = setTimeout(() => {
      performExit();
    }, 1200);

    return () => clearTimeout(fallbackTimer);
  }, []);

  // 3. When app initialization is ready, perform a smooth exit transition
  useEffect(() => {
    if (isReady) {
      const exitTimer = setTimeout(() => {
        performExit();
      }, 300);

      return () => clearTimeout(exitTimer);
    }
  }, [isReady]);

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent={true}
      statusBarTranslucent={true}
      animationType="none"
      onRequestClose={performExit}
    >
      <StatusBar style="light" />
      <Animated.View
        pointerEvents={hasExitedRef.current ? 'none' : 'auto'}
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            opacity: containerFade,
          },
        ]}
      >
        {/* Soft background glow behind logo */}
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: colors.primary,
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Brand Logo with scale & fade */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoFade,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Name & Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFade,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={[styles.brandTitle, { color: colors.text }]}>MOZHI</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            CONNECT • SHARE • ELEVATE
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    height: screenHeight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  logoContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
