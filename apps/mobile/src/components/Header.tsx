import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/useThemeStore';
import { useCreateSheetStore } from '../store/useCreateSheetStore';
import { spacing, typography } from '../theme/spacing';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showCreate?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showSearch = true,
  showNotifications = true,
  showCreate = true,
  rightAction,
}) => {
  const { colors } = useThemeStore();
  const router = useRouter();
  const openCreateSheet = useCreateSheetStore((s) => s.open);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <Text numberOfLines={1} style={[styles.brandText, { color: colors.text }]}>
          {title || 'Community'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {showSearch && (
          <TouchableOpacity
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showNotifications && (
          <TouchableOpacity
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showCreate && (
          <TouchableOpacity
            style={styles.createHeaderBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            onPress={openCreateSheet}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createGradientPill}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  logoImage: {
    width: 30,
    height: 30,
    borderRadius: 9,
    marginRight: spacing.sm,
  },
  brandText: {
    ...typography.h3,
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: spacing.xs,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createHeaderBtn: {
    marginLeft: 4,
    padding: 2,
  },
  createGradientPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
