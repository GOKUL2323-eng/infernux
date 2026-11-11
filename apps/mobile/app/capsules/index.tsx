import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { MemoryCapsuleSummary } from '@infernux/shared';

const UNLOCK_PRESETS = [
  { label: 'In 1 Hour', hours: 1 },
  { label: 'Tomorrow', hours: 24 },
  { label: 'Next Week', hours: 168 },
  { label: '30 Days', hours: 720 },
];

export default function MemoryCapsulesScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const [capsules, setCapsules] = useState<MemoryCapsuleSummary[]>([]);
  const [friends, setFriends] = useState<Array<{ id: string; username: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockHours, setUnlockHours] = useState(24);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [capRes, fRes] = await Promise.all([
      api.get<MemoryCapsuleSummary[]>('/experiences/capsules'),
      user?.id ? api.get<any>(`/users/${user.id}/following`) : Promise.resolve({ success: false, data: [] }),
    ]);
    if (capRes.success && capRes.data) setCapsules(capRes.data);
    if (fRes.success && fRes.data) {
      const list = Array.isArray(fRes.data) ? fRes.data : fRes.data.users || fRes.data.items || [];
      setFriends(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Required', 'Give your capsule a title and message.');
      return;
    }
    const unlockAt = new Date(Date.now() + unlockHours * 3600 * 1000).toISOString();
    const res = await api.post<MemoryCapsuleSummary>('/experiences/capsules', {
      title: title.trim(),
      message: message.trim(),
      recipientIds: selectedFriends,
      mediaUrls: [],
      unlockAt,
    });
    if (res.success) {
      setShowCreate(false);
      setTitle('');
      setMessage('');
      setSelectedFriends([]);
      await loadData();
    } else {
      Alert.alert('Error', res.error?.message || 'Could not seal memory capsule');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Memory Capsules</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.iconBtn}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {capsules.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="hourglass-outline" size={40} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 10 }}>No Time Capsules Yet</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                Seal notes and memories to unlock automatically for you and your friends on a future date.
              </Text>
            </View>
          ) : (
            capsules.map((cap) => (
              <View
                key={cap.id}
                style={[
                  styles.capsuleCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: cap.isUnlocked ? colors.accent : colors.border,
                  },
                ]}
              >
                <View style={styles.capsuleTop}>
                  <Ionicons
                    name={cap.isUnlocked ? 'lock-open' : 'lock-closed'}
                    size={18}
                    color={cap.isUnlocked ? colors.accent : colors.primary}
                  />
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, flex: 1, marginLeft: 8 }}>
                    {cap.title}
                  </Text>
                  <Text style={{ color: cap.isUnlocked ? colors.accent : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {cap.isUnlocked ? 'UNLOCKED' : `Unlocks ${new Date(cap.unlockAt).toLocaleDateString()}`}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>{cap.message}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
                  From @{cap.creator.username || 'you'} • {cap.recipientIds.length} recipient(s)
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Seal a Time Capsule</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Capsule Title (e.g. Year-End Notes)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write something meaningful to unlock later..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, minHeight: 80 }]}
            />

            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              Unlock Timer
            </Text>
            <View style={styles.chipsRow}>
              {UNLOCK_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setUnlockHours(p.hours)}
                  style={[
                    styles.chip,
                    { backgroundColor: unlockHours === p.hours ? colors.primary : colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: unlockHours === p.hours ? '#FFFFFF' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {friends.length > 0 && (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  Share With Friends
                </Text>
                <View style={styles.chipsRow}>
                  {friends.slice(0, 8).map((f) => {
                    const active = selectedFriends.includes(f.id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() =>
                          setSelectedFriends((prev) =>
                            prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                          )
                        }
                        style={[
                          styles.chip,
                          { backgroundColor: active ? colors.accent : colors.card, borderColor: colors.border },
                        ]}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary, fontSize: 12 }}>
                          @{f.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.sm }}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate}>
                <LinearGradient colors={colors.gradientPrimary} style={styles.sealBtn}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Seal Capsule</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  capsuleCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  capsuleTop: { flexDirection: 'row', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.lg },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  sealBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md },
});

