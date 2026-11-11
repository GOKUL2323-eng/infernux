import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { CreatorAnalyticsSummary, ReelSummary } from '@infernux/shared';

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [analytics, setAnalytics] = useState<CreatorAnalyticsSummary | null>(null);
  const [queue, setQueue] = useState<ReelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    const [aRes, qRes] = await Promise.all([
      api.get<CreatorAnalyticsSummary>('/creator/analytics'),
      api.get<ReelSummary[]>('/creator/drafts'),
    ]);
    if (aRes.success && aRes.data) setAnalytics(aRes.data);
    if (qRes.success && qRes.data) setQueue(qRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handlePublishNow = async (reelId: string) => {
    const res = await api.post<ReelSummary>(`/creator/reels/${reelId}/publish`);
    if (res.success) {
      Alert.alert('Published', 'Your draft/scheduled Reel is now live!');
      await loadDashboard();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to publish');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Creator Studio</Text>
        <TouchableOpacity onPress={loadDashboard} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
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
          {analytics && (
            <>
              <LinearGradient colors={colors.gradientPrimary} style={styles.heroCard}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 12 }}>
                  Engagement Rate
                </Text>
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 32, marginTop: 4 }}>
                  {analytics.engagementRate}%
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>
                  {analytics.followersCount.toLocaleString()} followers • {analytics.reelsCount} Reels • {analytics.postsCount} Posts
                </Text>
              </LinearGradient>

              <View style={styles.metricsGrid}>
                {[
                  { label: 'Views', value: analytics.totalViews, icon: 'eye-outline' },
                  { label: 'Likes', value: analytics.totalLikes, icon: 'heart-outline' },
                  { label: 'Comments', value: analytics.totalComments, icon: 'chatbubble-outline' },
                  { label: 'Shares', value: analytics.totalShares, icon: 'share-social-outline' },
                  { label: 'Saves', value: analytics.totalSaves, icon: 'bookmark-outline' },
                  { label: 'Drafts / Queue', value: analytics.draftsCount + analytics.scheduledCount, icon: 'time-outline' },
                ].map((m) => (
                  <View key={m.label} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name={m.icon as any} size={18} color={colors.primary} />
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, marginTop: 6 }}>
                      {m.value.toLocaleString()}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            Drafts & Scheduled Queue ({queue.length})
          </Text>
          {queue.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                No drafts or scheduled Reels queued right now.
              </Text>
            </View>
          ) : (
            queue.map((reel) => (
              <View key={reel.id} style={[styles.queueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                    {reel.caption || 'Untitled Reel'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                    {reel.status?.toUpperCase()} • {reel.playbackSpeed || 1}x speed • {reel.duration}s
                  </Text>
                  {reel.scheduledFor && (
                    <Text style={{ color: colors.accent, fontSize: 11, marginTop: 2 }}>
                      Scheduled: {new Date(reel.scheduledFor).toLocaleString()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handlePublishNow(reel.id)}
                  style={[styles.publishNowBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Publish Now</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {analytics && analytics.topReels.length > 0 && (
            <>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Top Performing Reels
              </Text>
              {analytics.topReels.map((r) => (
                <View key={r.id} style={[styles.queueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                      {r.caption || 'Reel'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {r.viewsCount} views • {r.likesCount} likes • {r.commentsCount} comments
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  heroCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    width: '31.5%',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  emptyCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  publishNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
});
