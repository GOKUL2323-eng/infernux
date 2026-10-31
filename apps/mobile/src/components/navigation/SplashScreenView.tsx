import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { typography, spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

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

  // Animated values
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance sequence: Logo fade in + subtle scale-up + soft glow + name appearance
    Animated.parallel([
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: isDarkMode ? 0.45 : 0.25,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  // 2. When app initialization is ready, perform a smooth exit transition
  useEffect(() => {
    if (isReady) {
      const exitTimer = setTimeout(() => {
        Animated.timing(containerFade, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setIsRendered(false);
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        });
      }, 350); // slight grace duration to allow entrance appreciation without lag

      return () => clearTimeout(exitTimer);
    }
  }, [isReady]);

  if (!isRendered) return null;

  return (
    <Animated.View
      pointerEvents={isReady ? 'none' : 'auto'}
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: containerFade,
          zIndex: 99999,
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
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    filter: 'blur(40px)',
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
