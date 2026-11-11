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
import { AudioRoomSummary, CommunitySummary } from '@infernux/shared';

export default function CommunitiesScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [liveRooms, setLiveRooms] = useState<AudioRoomSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCategory, setCommCategory] = useState('creators');

  const [showStartAudio, setShowStartAudio] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomTopic, setRoomTopic] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const q = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
    const [cRes, aRes] = await Promise.all([
      api.get<CommunitySummary[]>(`/communities${q}`),
      api.get<AudioRoomSummary[]>('/audio-rooms'),
    ]);
    if (cRes.success && cRes.data) setCommunities(cRes.data);
    if (aRes.success && aRes.data) setLiveRooms(aRes.data);
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

  const handleCreateCommunity = async () => {
    if (commName.trim().length < 2) {
      Alert.alert('Name Required', 'Enter at least 2 characters for the space name.');
      return;
    }
    const res = await api.post<CommunitySummary>('/communities', {
      name: commName.trim(),
      description: commDesc.trim() || 'Community space on MOZHI',
      category: commCategory,
      isPrivate: false,
    });
    if (res.success && res.data) {
      setShowCreateCommunity(false);
      setCommName('');
      setCommDesc('');
      await loadAll();
      router.push(`/communities/${res.data.id}` as any);
    } else {
      Alert.alert('Error', res.error?.message || 'Could not create community');
    }
  };

  const handleJoinCommunity = async (id: string) => {
    const res = await api.post<CommunitySummary>(`/communities/${id}/join`);
    if (res.success) {
      await loadAll();
      router.push(`/communities/${id}` as any);
    } else {
      Alert.alert('Error', res.error?.message || 'Could not join space');
    }
  };

  const handleStartAudioRoom = async () => {
    if (roomTitle.trim().length < 2) {
      Alert.alert('Title Required', 'Enter a title for the live audio stage.');
      return;
    }
    const res = await api.post<AudioRoomSummary>('/audio-rooms', {
      title: roomTitle.trim(),
      topic: roomTopic.trim() || undefined,
    });
    if (res.success && res.data) {
      setShowStartAudio(false);
      setRoomTitle('');
      setRoomTopic('');
      router.push(`/audio-rooms/${res.data.id}` as any);
    } else {
      Alert.alert('Error', res.error?.message || 'Could not start audio room');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Spaces & Live Audio</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => router.push('/files' as any)} style={styles.iconBtn}>
            <Ionicons name="folder-open-outline" size={21} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreateCommunity(true)} style={styles.iconBtn}>
            <Ionicons name="add-circle-outline" size={23} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadAll}
          placeholder="Search communities..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
        <TouchableOpacity onPress={loadAll}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Go</Text>
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
          {/* Live Audio Rooms */}
          <View style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: colors.text }]}>Live Audio Stages ({liveRooms.length})</Text>
            <TouchableOpacity onPress={() => setShowStartAudio(true)}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.smallGradientBtn}>
                <Ionicons name="mic" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Go Live</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {liveRooms.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                No live audio rooms active right now. Start one to host speakers & listeners!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {liveRooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => router.push(`/audio-rooms/${room.id}` as any)}
                  style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={{ color: '#F04BBE', fontSize: 10, fontWeight: '800' }}>LIVE AUDIO</Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 6 }}>
                    {room.title}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    Host: @{room.host.username} • {room.participants.length} in room
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Community Directory */}
          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm }]}>
            Community Spaces ({communities.length})
          </Text>
          {communities.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                No communities found. Tap + above to create the first space.
              </Text>
            </View>
          ) : (
            communities.map((comm) => (
              <TouchableOpacity
                key={comm.id}
                onPress={() => router.push(`/communities/${comm.id}` as any)}
                style={[styles.commCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.commIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="planet" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{comm.name}</Text>
                  <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {comm.description}
                  </Text>
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                    {comm.category.toUpperCase()} • {comm.membersCount} members • {comm.channelsCount} channels
                  </Text>
                </View>
                {comm.isMember ? (
                  <View style={[styles.badgeBtn, { backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                      {comm.myRole === 'owner' ? 'Owner' : 'Open'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleJoinCommunity(comm.id)}
                    style={[styles.badgeBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Join</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Community Modal */}
      <Modal visible={showCreateCommunity} transparent animationType="slide" onRequestClose={() => setShowCreateCommunity(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>New Community Space</Text>
            <TextInput
              value={commName}
              onChangeText={setCommName}
              placeholder="Space name (e.g. Indie Filmmakers)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              value={commDesc}
              onChangeText={setCommDesc}
              placeholder="What is this space about?"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, minHeight: 70 }]}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
              {['creators', 'music', 'tech', 'gaming'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCommCategory(cat)}
                  style={[
                    styles.catChip,
                    { backgroundColor: commCategory === cat ? colors.primary : colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: commCategory === cat ? '#FFFFFF' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCreateCommunity(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateCommunity} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create Space</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Live Audio Room Modal */}
      <Modal visible={showStartAudio} transparent animationType="slide" onRequestClose={() => setShowStartAudio(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Start Live Audio Stage</Text>
            <TextInput
              value={roomTitle}
              onChangeText={setRoomTitle}
              placeholder="Room title (e.g. Late Night Q&A)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <TextInput
              value={roomTopic}
              onChangeText={setRoomTopic}
              placeholder="Topic tag (optional)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowStartAudio(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStartAudioRoom} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Start Stage</Text>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  smallGradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  emptyCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  audioCard: {
    width: 220,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F04BBE' },
  commCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  commIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: borderRadius.md },
});

