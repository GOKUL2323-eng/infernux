import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, typography } from '../theme/spacing';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showSearch = true,
  showNotifications = true,
  rightAction,
}) => {
  const { colors } = useThemeStore();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.brandRow}>
        <Ionicons name="flame" size={26} color={colors.primary} />
        <Text style={[styles.brandText, { color: colors.text }]}>
          {title || 'INFERNUX'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {showSearch && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}

        {showNotifications && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}

        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
});

