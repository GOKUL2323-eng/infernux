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
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { MoodEntrySummary, MoodType, TogetherSessionSummary, TogetherSessionType } from '@infernux/shared';

const MOODS: { key: MoodType; emoji: string; label: string; color: string }[] = [
  { key: 'happy', emoji: '😊', label: 'Happy', color: '#22C55E' },
  { key: 'inspired', emoji: '✨', label: 'Inspired', color: '#A020F0' },
  { key: 'calm', emoji: '🌙', label: 'Calm', color: '#3B82F6' },
  { key: 'hyped', emoji: '🔥', label: 'Hyped', color: '#F04BBE' },
  { key: 'focused', emoji: '🎧', label: 'Focused', color: '#8B5CF6' },
  { key: 'grateful', emoji: '💜', label: 'Grateful', color: '#EC4899' },
  { key: 'tired', emoji: '☕', label: 'Low Energy', color: '#F59E0B' },
  { key: 'melancholy', emoji: '🌧️', label: 'Reflective', color: '#6366F1' },
];

export default function MoodSpaceScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [selectedMood, setSelectedMood] = useState(MOODS[1]);
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [feed, setFeed] = useState<MoodEntrySummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [togetherSessions, setTogetherSessions] = useState<TogetherSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Start Together Mode Modal
  const [showTogetherModal, setShowTogetherModal] = useState(false);
  const [togetherTitle, setTogetherTitle] = useState('');
  const [togetherType, setTogetherType] = useState<TogetherSessionType>('listen');
  const [togetherTrack, setTogetherTrack] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [myRes, feedRes, togRes] = await Promise.all([
      api.get<{ entries: MoodEntrySummary[]; counts: Record<string, number> }>('/experiences/moods'),
      api.get<MoodEntrySummary[]>('/experiences/moods/feed'),
      api.get<TogetherSessionSummary[]>('/experiences/together'),
    ]);
    if (myRes.success && myRes.data) setCounts(myRes.data.counts);
    if (feedRes.success && feedRes.data) setFeed(feedRes.data);
    if (togRes.success && togRes.data) setTogetherSessions(togRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleLogMood = async () => {
    const res = await api.post<MoodEntrySummary>('/experiences/moods', {
      mood: selectedMood.key,
      emoji: selectedMood.emoji,
      note: note.trim() || undefined,
      colorHex: selectedMood.color,
      isPublic,
    });
    if (res.success) {
      setNote('');
      Alert.alert('Mood Updated', `Logged ${selectedMood.emoji} ${selectedMood.label}`);
      await loadAll();
    } else {
      Alert.alert('Error', res.error?.message || 'Could not log mood');
    }
  };

  const handleStartTogether = async () => {
    if (togetherTitle.trim().length < 2) return;
    const res = await api.post<TogetherSessionSummary>('/experiences/together', {
      title: togetherTitle.trim(),
      sessionType: togetherType,
      trackTitle: togetherTrack.trim() || undefined,
    });
    if (res.success && res.data) {
      setShowTogetherModal(false);
      setTogetherTitle('');
      setTogetherTrack('');
      router.push(`/together/${res.data.id}` as any);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>MoodSpace & Together</Text>
        <TouchableOpacity onPress={() => router.push('/capsules' as any)} style={styles.iconBtn}>
          <Ionicons name="hourglass-outline" size={21} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Mood Logger */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: selectedMood.color }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 10 }]}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((m) => {
              const active = selectedMood.key === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setSelectedMood(m)}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: active ? m.color : colors.surface,
                      borderColor: active ? '#FFFFFF' : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Quick thought for your circle (optional)..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsPublic((p) => !p)} style={styles.visToggle}>
              <Ionicons name={isPublic ? 'earth-outline' : 'lock-closed-outline'} size={15} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {isPublic ? 'Share with Followers' : 'Private Journal'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogMood}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.logBtn}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Log Mood</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Together Mode Active Sessions */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.text }]}>Together Mode ({togetherSessions.length})</Text>
          <TouchableOpacity onPress={() => setShowTogetherModal(true)} style={[styles.smallBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>+ Co-Watch / Listen</Text>
          </TouchableOpacity>
        </View>
        {togetherSessions.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Start a synchronized Watch, Listen, or Study Together session with friends.
            </Text>
          </View>
        ) : (
          togetherSessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => router.push(`/together/${s.id}` as any)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}
            >
              <Ionicons name="sync-circle" size={26} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{s.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {s.sessionType.toUpperCase()} • {s.participants.length} joined • {s.isPlaying ? 'Playing' : 'Paused'}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Join</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Mood Summary Counts */}
        {Object.keys(counts).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              YOUR MOOD SPECTRUM
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(counts).map(([k, v]) => (
                <View key={k} style={[styles.statPill, { backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                    {k}: {v}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Friends Mood Feed */}
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Circle Mood Feed</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          feed.map((m) => (
            <View key={m.id} style={[styles.card, { backgroundColor: colors.card, borderColor: m.colorHex }]}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                {m.emoji} @{m.user.username} feels {m.mood}
              </Text>
              {m.note ? <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{m.note}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showTogetherModal} transparent animationType="slide" onRequestClose={() => setShowTogetherModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 10 }]}>New Together Session</Text>
            <TextInput
              value={togetherTitle}
              onChangeText={setTogetherTitle}
              placeholder="Session title (e.g. Lo-Fi Study Session)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              value={togetherTrack}
              onChangeText={setTogetherTrack}
              placeholder="Track / Video title (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {(['watch', 'listen', 'study'] as TogetherSessionType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTogetherType(t)}
                  style={[
                    styles.chip,
                    { backgroundColor: togetherType === t ? colors.primary : colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowTogetherModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStartTogether} style={[styles.smallBtn, { backgroundColor: colors.primary, paddingVertical: 10 }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Launch</Text>
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
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, marginBottom: 10 },
  visToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: borderRadius.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.lg },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
});

