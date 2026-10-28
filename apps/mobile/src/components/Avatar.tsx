import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';

interface AvatarProps {
  url?: string;
  name?: string;
  size?: number;
  isOnline?: boolean;
  isVerified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name = 'User',
  size = 44,
  isOnline,
  isVerified,
}) => {
  const { colors } = useThemeStore();

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceElevated },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4, color: colors.primary }]}>
            {initials}
          </Text>
        </View>
      )}

      {isOnline !== undefined && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isOnline ? colors.online : colors.offline,
              borderColor: colors.background,
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
            },
          ]}
        />
      )}

      {isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={size * 0.35} color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
  },
});
