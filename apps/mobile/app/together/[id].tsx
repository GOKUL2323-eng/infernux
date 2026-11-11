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
import { SOCKET_EVENTS, TogetherSessionSummary } from '@infernux/shared';

export default function TogetherSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const [session, setSession] = useState<TogetherSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const joinAndLoad = async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.post<TogetherSessionSummary>(`/experiences/together/${id}/join`);
    if (res.success && res.data) setSession(res.data);
    setLoading(false);
  };

  useEffect(() => {
    joinAndLoad();
    const sock = socketClient.getSocket();
    if (sock && id) {
      sock.emit(SOCKET_EVENTS.TOGETHER_JOIN, id);
      const onState = (updated: TogetherSessionSummary) => {
        if (updated.id === id) setSession(updated);
      };
      sock.on(SOCKET_EVENTS.TOGETHER_STATE, onState);
      return () => {
        sock.emit(SOCKET_EVENTS.TOGETHER_LEAVE, id);
        sock.off(SOCKET_EVENTS.TOGETHER_STATE, onState);
      };
    }
  }, [id]);

  const syncPlayback = async (playbackPositionSec: number, isPlaying: boolean) => {
    if (!id) return;
    const res = await api.post<TogetherSessionSummary>(`/experiences/together/${id}/sync`, {
      playbackPositionSec: Math.max(0, playbackPositionSec),
      isPlaying,
    });
    if (res.success && res.data) setSession(res.data);
  };

  const handleEnd = async () => {
    const res = await api.post<TogetherSessionSummary>(`/experiences/together/${id}/end`);
    if (res.success) {
      Alert.alert('Session Ended', 'Together Mode session closed.');
      router.back();
    }
  };

  const isHost = session?.hostId === user?.id;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={[typography.h3, { color: colors.text, flex: 1, marginHorizontal: 8 }]}>
          {session?.title || 'Together Mode'}
        </Text>
        {isHost && session?.status === 'active' && (
          <TouchableOpacity onPress={handleEnd} style={[styles.endBtn, { backgroundColor: colors.error }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>End</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={colors.gradientPrimary} style={styles.stageCard}>
            <Ionicons
              name={session?.sessionType === 'watch' ? 'tv-outline' : session?.sessionType === 'study' ? 'book-outline' : 'musical-notes'}
              size={44}
              color="#FFFFFF"
            />
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 20, marginTop: 10 }}>
              {session?.trackTitle || session?.title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>
              Position: {Math.round(session?.playbackPositionSec || 0)}s • {session?.isPlaying ? 'SYNCHRONIZED PLAYING' : 'PAUSED'}
            </Text>
          </LinearGradient>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => syncPlayback((session?.playbackPositionSec || 0) - 15, Boolean(session?.isPlaying))}
              style={[styles.ctrlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="play-back" size={22} color={colors.text} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => syncPlayback(session?.playbackPositionSec || 0, !session?.isPlaying)}
              style={[styles.ctrlBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Ionicons name={session?.isPlaying ? 'pause' : 'play'} size={26} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                {session?.isPlaying ? 'Pause All' : 'Play All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => syncPlayback((session?.playbackPositionSec || 0) + 15, Boolean(session?.isPlaying))}
              style={[styles.ctrlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="play-forward" size={22} color={colors.text} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>+15s</Text>
            </TouchableOpacity>
          </View>

          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            Participants ({session?.participants.length || 0})
          </Text>
          <View style={styles.partRow}>
            {session?.participants.map((p) => (
              <View key={p.id} style={[styles.partChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>@{p.username}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6 },
  endBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md },
  stageCard: { borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  controlsRow: { flexDirection: 'row', gap: spacing.sm },
  ctrlBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  partRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  partChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
});

