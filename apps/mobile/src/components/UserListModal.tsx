import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useThemeStore } from '../store/useThemeStore';
import { Avatar } from './Avatar';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { UserSummary } from '@infernux/shared';

interface UserListModalProps {
  visible: boolean;
  title: string;
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({
  visible,
  title,
  userId,
  type,
  onClose,
}) => {
  const { colors } = useThemeStore();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && userId) {
      loadUsers();
    }
  }, [visible, userId, type]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'followers' ? `/users/${userId}/followers` : `/users/${userId}/following`;
      const res = await api.get<UserSummary[]>(endpoint);
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUser: UserSummary) => {
    // optimistic
    const isCurrentlyFollowing = true; // In following list or toggled
    if (type === 'following') {
      await api.delete(`/users/${targetUser.id}/unfollow`);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    } else {
      await api.post(`/users/${targetUser.id}/follow`);
    }
  };

  const renderItem = ({ item }: { item: UserSummary }) => (
    <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
      <Avatar url={item.avatarUrl} name={item.displayName} size={44} isVerified={item.isVerified} />
      <View style={styles.userInfo}>
        <Text style={[typography.body1, { color: colors.text, fontWeight: '600' }]}>
          {item.displayName || item.username}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleToggleFollow(item)}
        style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
      >
        <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
          {type === 'following' ? 'Unfollow' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyCenter}>
                <Ionicons name="people-outline" size={44} color={colors.textMuted} />
                <Text style={[typography.body1, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  No {type} yet
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  emptyCenter: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

