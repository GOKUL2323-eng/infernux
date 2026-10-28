import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Avatar } from '../../src/components/Avatar';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { SocialNote } from '@infernux/shared';

export default function SocialNotesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();

  const [notes, setNotes] = useState<SocialNote[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSocialNotes();
  }, []);

  const fetchSocialNotes = async () => {
    const res = await api.get<SocialNote[]>('/notes/social/feed');
    if (res.success && res.data) {
      setNotes(res.data);
    }
  };

  const handleLike = async (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          const isLiked = !n.isLiked;
          return {
            ...n,
            isLiked,
            likesCount: isLiked ? n.likesCount + 1 : Math.max(0, n.likesCount - 1),
          };
        }
        return n;
      })
    );
    await api.post(`/notes/social/${noteId}/like`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSocialNotes();
    setRefreshing(false);
  };

  const renderNoteItem = ({ item }: { item: SocialNote }) => {
    const isMe = item.authorId === user?.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Avatar url={item.author.avatarUrl} name={item.author.displayName} size={42} isVerified={item.author.isVerified} />
          <View style={styles.headerInfo}>
            <Text style={[typography.body1, { color: colors.text, fontWeight: '700' }]}>
              {item.author.displayName || item.author.username}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              @{item.author.username} • 24h status
            </Text>
          </View>
          {item.emoji && <Text style={styles.emojiText}>{item.emoji}</Text>}
        </View>

        <Text style={[typography.body1, { color: colors.text, marginTop: spacing.sm }]}>
          {item.text}
        </Text>

        {item.musicTrack && (
          <View style={[styles.musicBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="musical-notes" size={16} color={colors.primary} />
            <Text numberOfLines={1} style={[typography.caption, { color: colors.text, marginLeft: 6, flex: 1 }]}>
              {item.musicTrack.title} • {item.musicTrack.artist}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.likeBtn}>
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={item.isLiked ? colors.error : colors.textSecondary}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
              {item.likesCount}
            </Text>
          </TouchableOpacity>

          {!isMe && (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/chats` as any)}
              style={styles.replyBtn}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
                Reply
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Social Notes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/create' as any)}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
              No Social Notes
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Share a quick thought or song snippet with your followers!
            </Text>
          </View>
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  emojiText: {
    fontSize: 26,
  },
  musicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
