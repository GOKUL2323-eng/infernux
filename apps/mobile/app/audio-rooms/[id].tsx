import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/api/client';
import { socketClient } from '../../src/socket/socketClient';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { AudioRoomSummary, SOCKET_EVENTS } from '@infernux/shared';

export default function AudioRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const [room, setRoom] = useState<AudioRoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastBurst, setLastBurst] = useState<string>('');

  const joinAndSync = async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/join`);
    if (res.success && res.data) {
      setRoom(res.data);
    } else {
      const gRes = await api.get<AudioRoomSummary>(`/audio-rooms/${id}`);
      if (gRes.success && gRes.data) setRoom(gRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    joinAndSync();
    const sock = socketClient.getSocket();
    if (sock && id) {
      sock.emit(SOCKET_EVENTS.AUDIO_ROOM_JOIN, id);
      const onState = (updated: AudioRoomSummary) => {
        if (updated.id === id) setRoom(updated);
      };
      const onReact = (evt: { roomId: string; emoji: string }) => {
        if (evt.roomId === id) setLastBurst(evt.emoji);
      };
      sock.on(SOCKET_EVENTS.AUDIO_ROOM_STATE, onState);
      sock.on(SOCKET_EVENTS.AUDIO_ROOM_REACTION, onReact);
      return () => {
        sock.emit(SOCKET_EVENTS.AUDIO_ROOM_LEAVE, id);
        sock.off(SOCKET_EVENTS.AUDIO_ROOM_STATE, onState);
        sock.off(SOCKET_EVENTS.AUDIO_ROOM_REACTION, onReact);
      };
    }
  }, [id]);

  const handleToggleHand = async () => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/hand`);
    if (res.success && res.data) setRoom(res.data);
  };

  const handleToggleMute = async () => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/mute`, {});
    if (res.success && res.data) setRoom(res.data);
  };

  const handleApproveSpeaker = async (targetUserId: string) => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/speakers/${targetUserId}/approve`);
    if (res.success && res.data) setRoom(res.data);
  };

  const handleRevokeSpeaker = async (targetUserId: string) => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/speakers/${targetUserId}/revoke`);
    if (res.success && res.data) setRoom(res.data);
  };

  const handleReact = async (emoji: string) => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/react`, { emoji });
    if (res.success && res.data) setRoom(res.data);
  };

  const handleLeave = async () => {
    await api.post(`/audio-rooms/${id}/leave`);
    router.back();
  };

  const handleEndRoom = async () => {
    const res = await api.post<AudioRoomSummary>(`/audio-rooms/${id}/end`);
    if (res.success) {
      Alert.alert('Stage Ended', 'The live audio room has closed.');
      router.back();
    }
  };

  const isHost = room?.hostId === user?.id;
  const me = room?.participants.find((p) => p.userId === user?.id);
  const speakers = room?.participants.filter((p) => p.role === 'host' || p.role === 'speaker') || [];
  const listeners = room?.participants.filter((p) => p.role === 'listener') || [];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleLeave} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text numberOfLines={1} style={[typography.h3, { color: colors.text }]}>
            {room?.title || 'Audio Stage'}
          </Text>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
            {room?.status === 'ended' ? 'ENDED' : 'LIVE AUDIO'} {lastBurst ? `• ${lastBurst}` : ''}
          </Text>
        </View>
        {isHost && room?.status === 'live' && (
          <TouchableOpacity onPress={handleEndRoom} style={[styles.endBtn, { backgroundColor: colors.error }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>End Stage</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              STAGE SPEAKERS ({speakers.length})
            </Text>
            <View style={styles.grid}>
              {speakers.map((p) => (
                <View key={p.userId} style={[styles.speakerCard, { backgroundColor: colors.card, borderColor: p.isMuted ? colors.border : colors.primary }]}>
                  <LinearGradient colors={colors.gradientPrimary} style={styles.avatarCircle}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 18 }}>
                      {(p.displayName || p.username || 'U')[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginTop: 6 }}>
                    @{p.username}
                  </Text>
                  <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                    {p.role.toUpperCase()} {p.isMuted ? '• MUTED' : '• LIVE'} {p.lastReaction || ''}
                  </Text>
                  {isHost && p.role === 'speaker' && (
                    <TouchableOpacity onPress={() => handleRevokeSpeaker(p.userId)} style={{ marginTop: 6 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>Move to Audience</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {isHost && room && room.speakerRequests.length > 0 && (
              <View style={[styles.requestsBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12, marginBottom: 6 }}>
                  Raised Hands ({room.speakerRequests.length})
                </Text>
                {room.speakerRequests.map((reqId) => {
                  const reqUser = room.participants.find((p) => p.userId === reqId);
                  return (
                    <View key={reqId} style={styles.reqRow}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>
                        @{reqUser?.username || reqId}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleApproveSpeaker(reqId)}
                        style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }}>Bring to Stage</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
              AUDIENCE LISTENERS ({listeners.length})
            </Text>
            <View style={styles.grid}>
              {listeners.map((p) => (
                <View key={p.userId} style={[styles.listenerChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>
                    {p.handRaised ? '✋ ' : ''}@{p.username} {p.lastReaction || ''}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.dock, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.emojiBar}>
              {['🔥', '👏', '💜', '🚀', '✨'].map((emoji) => (
                <TouchableOpacity key={emoji} onPress={() => handleReact(emoji)} style={[styles.emojiBtn, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleToggleHand}
                style={[styles.dockBtn, { backgroundColor: me?.handRaised ? colors.accent : colors.card }]}
              >
                <Ionicons name="hand-left-outline" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                  {me?.handRaised ? 'Lower Hand' : 'Raise Hand'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleMute}
                style={[styles.dockBtn, { backgroundColor: me?.isMuted ? colors.card : colors.primary }]}
              >
                <Ionicons name={me?.isMuted ? 'mic-off-outline' : 'mic-outline'} size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                  {me?.isMuted ? 'Unmute' : 'Muted Off'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6 },
  endBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  speakerCard: {
    width: '47%',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  approveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  listenerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  dock: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  emojiBar: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  emojiBtn: { width: 42, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  controlsRow: { flexDirection: 'row', gap: 10 },
  dockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
  },
});
