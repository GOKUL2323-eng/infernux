import React, { useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/useThemeStore';
import { useNativeDriver } from '../../utils/animationHelper';
import { spacing, typography } from '../../theme/spacing';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  colors?: [string, string, ...string[]];
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  colors: customColors,
}) => {
  const { colors } = useThemeStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 5,
      tension: 100,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver,
    }).start();
  };

  const isOutline = variant === 'outline';
  const gradientColors = customColors || colors.gradientPrimary;

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
    md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16 },
    lg: { paddingVertical: 16, paddingHorizontal: 26, borderRadius: 20 },
  }[size];

  const fontSize = size === 'sm' ? 12.5 : size === 'lg' ? 16 : 14.5;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[styles.touchable, disabled && styles.disabled]}
      >
        {isOutline ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.outlineBorder, { borderRadius: sizeStyles.borderRadius }]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onPress}
              disabled={disabled || loading}
              style={[
                styles.outlineInner,
                sizeStyles,
                { backgroundColor: colors.background, borderRadius: sizeStyles.borderRadius - 1.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <>
                  {icon}
                  <Text
                    style={[
                      typography.button,
                      { color: colors.text, fontSize, fontWeight: '700' },
                      icon ? { marginLeft: spacing.xs } : null,
                      textStyle,
                    ]}
                  >
                    {title}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              sizeStyles,
              styles.glow,
              { shadowColor: colors.primary },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                {icon}
                <Text
                  style={[
                    typography.button,
                    { color: '#FFFFFF', fontSize, fontWeight: '700' },
                    icon ? { marginLeft: spacing.xs } : null,
                    textStyle,
                  ]}
                >
                  {title}
                </Text>
              </>
            )}
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 16,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(160, 32, 240, 0.35)',
      } as any,
    }),
  },
  outlineBorder: {
    padding: 1.5,
  },
  outlineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

