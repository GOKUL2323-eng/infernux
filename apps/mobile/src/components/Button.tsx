import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors } = useThemeStore();

  const isGradient = variant === 'primary';

  const containerPadding = {
    sm: { paddingVertical: 8, paddingHorizontal: 12 },
    md: { paddingVertical: 12, paddingHorizontal: 20 },
    lg: { paddingVertical: 16, paddingHorizontal: 24 },
  }[size];

  const content = (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        containerPadding,
        variant === 'outline' && {
          borderWidth: 1.5,
          borderColor: colors.primary,
          backgroundColor: 'transparent',
        },
        variant === 'secondary' && {
          backgroundColor: colors.surfaceElevated,
        },
        variant === 'danger' && {
          backgroundColor: colors.error,
        },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.button,
              {
                color:
                  variant === 'outline'
                    ? colors.primary
                    : variant === 'ghost'
                    ? colors.textSecondary
                    : '#FFFFFF',
                marginLeft: icon ? spacing.xs : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (isGradient && !disabled) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={loading} style={style}>
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, containerPadding, styles.gradientRadius]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon}
              <Text style={[typography.button, { color: '#FFFFFF', marginLeft: icon ? spacing.xs : 0 }, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  gradientRadius: {
    borderRadius: borderRadius.md,
  },
  disabled: {
    opacity: 0.5,
  },
});

