import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { UserSummary } from '@infernux/shared';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    const res = await api.get<UserSummary[]>(`/users/search?q=${encodeURIComponent(text.trim())}`);
    setIsSearching(false);

    if (res.success && res.data) {
      setUsers(res.data);
    }
  };

  const renderUserItem = ({ item }: { item: UserSummary }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/(tabs)/profile` as any)}
      style={[styles.userRow, { borderBottomColor: colors.border }]}
    >
      <Avatar url={item.avatarUrl} name={item.displayName} size={46} isVerified={item.isVerified} />
      <View style={styles.userInfo}>
        <Text style={[typography.body1, { color: colors.text, fontWeight: '700' }]}>
          {item.displayName}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => api.post(`/users/${item.id}/follow`)}
        style={[styles.followBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.button, { color: '#FFFFFF', fontSize: 12 }]}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Search users, hashtags, rooms..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoFocus
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.trim().length > 0 && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
                No Results Found
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    height: '100%',
  },
  list: {
    padding: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  followBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
});

