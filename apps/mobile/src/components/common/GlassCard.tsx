import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'subtle' | 'gradientBorder';
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'elevated',
  glow = false,
}) => {
  const { colors } = useThemeStore();

  const backgroundColor =
    variant === 'subtle' ? colors.surface : colors.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor: colors.border,
        },
        glow && {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 5,
          ...Platform.select({
            web: {
              boxShadow: `0 4px 20px ${colors.neonGlow}`,
            } as any,
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
