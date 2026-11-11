import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/api/client';
import { uploadMediaAsset, sanitizeMediaUrl } from '../../src/utils/uploadHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { SnapFilterPreset, SnapMomentSummary } from '@infernux/shared';

const FILTERS: { key: SnapFilterPreset; label: string; tint: string }[] = [
  { key: 'normal', label: 'Normal', tint: 'transparent' },
  { key: 'neon', label: 'Neon Glow', tint: 'rgba(160, 32, 240, 0.25)' },
  { key: 'vaporwave', label: 'Vapor', tint: 'rgba(240, 75, 190, 0.25)' },
  { key: 'noir', label: 'Noir', tint: 'rgba(10, 10, 14, 0.45)' },
  { key: 'vivid', label: 'Vivid', tint: 'rgba(139, 92, 246, 0.18)' },
  { key: 'warm', label: 'Warm Dusk', tint: 'rgba(245, 158, 11, 0.20)' },
];

const TIMER_OPTIONS = [5, 10, 30, 60];

export default function SnapMomentsScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<'inbox' | 'sent' | 'capture'>('inbox');
  const [inbox, setInbox] = useState<SnapMomentSummary[]>([]);
  const [sent, setSent] = useState<SnapMomentSummary[]>([]);
  const [friends, setFriends] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Composer state
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [filter, setFilter] = useState<SnapFilterPreset>('neon');
  const [disappearingSeconds, setDisappearingSeconds] = useState(10);
  const [allowReplay, setAllowReplay] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Viewer modal state
  const [activeSnap, setActiveSnap] = useState<SnapMomentSummary | null>(null);
  const [countdown, setCountdown] = useState(0);

  const loadData = async () => {
    setLoading(true);
    const [inboxRes, sentRes, followingRes] = await Promise.all([
      api.get<SnapMomentSummary[]>('/snaps/inbox'),
      api.get<SnapMomentSummary[]>('/snaps/sent'),
      user?.id ? api.get<any>(`/users/${user.id}/following`) : Promise.resolve({ success: false, data: [] }),
    ]);
    if (inboxRes.success && inboxRes.data) setInbox(inboxRes.data);
    if (sentRes.success && sentRes.data) setSent(sentRes.data);
    if (followingRes.success && followingRes.data) {
      const list = Array.isArray(followingRes.data)
        ? followingRes.data
        : followingRes.data.users || followingRes.data.items || [];
      setFriends(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (!activeSnap || countdown <= 0) return;
    const t = setTimeout(() => {
      if (countdown <= 1) {
        setActiveSnap(null);
        setCountdown(0);
        loadData();
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [activeSnap, countdown]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCaptureCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow camera access to capture a Snap Moment.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.length) {
      setAsset(res.assets[0]);
      setTab('capture');
    }
  };

  const handlePickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.length) {
      setAsset(res.assets[0]);
      setTab('capture');
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSendSnap = async () => {
    if (!asset) {
      Alert.alert('Media Needed', 'Capture or select a photo/video first.');
      return;
    }
    if (selectedRecipients.length === 0) {
      Alert.alert('Select Friends', 'Choose at least one friend to send this Snap Moment to.');
      return;
    }
    setSending(true);
    try {
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      const mediaUrl = await uploadMediaAsset({
        uri: asset.uri,
        type: mediaType,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });

      const res = await api.post<SnapMomentSummary>('/snaps', {
        recipientIds: selectedRecipients,
        mediaType,
        mediaUrl,
        caption: caption.trim() || undefined,
        filter,
        overlays: overlayText.trim()
          ? [
              {
                id: `ov_${Date.now()}`,
                type: 'text',
                content: overlayText.trim(),
                x: 0.5,
                y: 0.45,
                color: '#FFFFFF',
                scale: 1,
              },
            ]
          : [],
        disappearingSeconds,
        allowReplay,
      });

      if (res.success) {
        Alert.alert('Snap Sent', 'Your disappearing Snap Moment was delivered.');
        setAsset(null);
        setCaption('');
        setOverlayText('');
        setSelectedRecipients([]);
        setTab('sent');
        await loadData();
      } else {
        Alert.alert('Failed', res.error?.message || 'Could not send Snap Moment');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setSending(false);
    }
  };

  const handleOpenSnap = async (snap: SnapMomentSummary) => {
    const res = await api.post<SnapMomentSummary>(`/snaps/${snap.id}/open`);
    if (res.success && res.data) {
      if (res.data.isExpired || !res.data.mediaUrl) {
        Alert.alert('Expired', 'This Snap Moment has expired and can no longer be viewed.');
        await loadData();
        return;
      }
      setActiveSnap(res.data);
      setCountdown(res.data.disappearingSeconds || 10);
    } else {
      Alert.alert('Unavailable', res.error?.message || 'Could not open snap');
    }
  };

  const handleReplaySnap = async (snap: SnapMomentSummary) => {
    const res = await api.post<SnapMomentSummary>(`/snaps/${snap.id}/replay`);
    if (res.success && res.data) {
      setActiveSnap(res.data);
      setCountdown(res.data.disappearingSeconds || 10);
      await loadData();
    } else {
      Alert.alert('Replay Unavailable', res.error?.message || 'Replay limit reached');
    }
  };

  const handleReportScreenshot = async (snapId: string) => {
    const res = await api.post<SnapMomentSummary>(`/snaps/${snapId}/screenshot`);
    if (res.success) {
      Alert.alert('Screenshot Notified', 'The sender has been notified of a screenshot alert.');
    }
  };

  const activeTint = FILTERS.find((f) => f.key === filter)?.tint || 'transparent';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Snap Moments</Text>
        <TouchableOpacity onPress={handleCaptureCamera} style={styles.iconBtn}>
          <Ionicons name="camera-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
        {(['inbox', 'sent', 'capture'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: tab === t ? '#FFFFFF' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
              {t === 'inbox' ? `Inbox (${inbox.length})` : t === 'sent' ? `Sent (${sent.length})` : 'Create Snap'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && tab !== 'capture' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === 'capture' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.captureActions}>
            <TouchableOpacity style={[styles.captureBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleCaptureCamera}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.captureBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handlePickGallery}>
              <Ionicons name="images" size={24} color={colors.accent} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {asset && (
            <View style={[styles.previewBox, { borderColor: colors.border }]}>
              <Image source={{ uri: sanitizeMediaUrl(asset.uri) }} style={styles.previewImg} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: activeTint }]} />
              {overlayText.trim() ? (
                <View style={styles.overlayBadge}>
                  <Text style={styles.overlayBadgeText}>{overlayText}</Text>
                </View>
              ) : null}
            </View>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Color Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filter === f.key ? colors.primary : colors.card,
                    borderColor: filter === f.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: filter === f.key ? '#FFFFFF' : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            value={overlayText}
            onChangeText={setOverlayText}
            placeholder="Sticker / Text Overlay (optional)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Caption (optional)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.label, { color: colors.text }]}>Disappearing Timer</Text>
          <View style={styles.rowWrap}>
            {TIMER_OPTIONS.map((sec) => (
              <TouchableOpacity
                key={sec}
                onPress={() => setDisappearingSeconds(sec)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: disappearingSeconds === sec ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: disappearingSeconds === sec ? '#FFFFFF' : colors.text, fontWeight: '700' }}>
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setAllowReplay((v) => !v)}
              style={[
                styles.chip,
                {
                  backgroundColor: allowReplay ? colors.accent : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                {allowReplay ? 'Replay Allowed' : 'View Once'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: spacing.md }]}>
            Send to Friends ({selectedRecipients.length} selected)
          </Text>
          <View style={styles.rowWrap}>
            {friends.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Follow friends from Search to send Snaps directly.
              </Text>
            ) : (
              friends.map((f) => {
                const fid = f.id;
                const active = selectedRecipients.includes(fid);
                return (
                  <TouchableOpacity
                    key={fid}
                    onPress={() => toggleRecipient(fid)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 12 }}>
                      @{f.username}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <TouchableOpacity onPress={handleSendSnap} disabled={sending} style={{ marginTop: spacing.lg }}>
            <LinearGradient colors={colors.gradientPrimary} style={styles.sendBtn}>
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Send Snap Moment</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {(tab === 'inbox' ? inbox : sent).length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="flash-outline" size={38} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 10 }}>
                No {tab === 'inbox' ? 'incoming' : 'sent'} Snap Moments yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                Capture a quick photo or clip with disappearing timers.
              </Text>
            </View>
          ) : (
            (tab === 'inbox' ? inbox : sent).map((item) => (
              <View key={item.id} style={[styles.snapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>
                    {tab === 'inbox' ? `@${item.sender.username}` : `To ${item.recipientIds.length} friend(s)`}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>
                    {item.filter.toUpperCase()} • {item.disappearingSeconds}s •{' '}
                    {item.isExpired
                      ? 'Expired'
                      : item.hasViewedByMe
                      ? 'Opened'
                      : tab === 'inbox'
                      ? 'Tap to Open'
                      : `${item.viewedByIds.length} viewed`}
                  </Text>
                  {item.screenshotAlerts.length > 0 && (
                    <Text style={{ color: colors.error, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                      Screenshot alert: {item.screenshotAlerts.map((a) => `@${a.username || 'user'}`).join(', ')}
                    </Text>
                  )}
                </View>

                {tab === 'inbox' && !item.hasViewedByMe && !item.isExpired && (
                  <TouchableOpacity
                    onPress={() => handleOpenSnap(item)}
                    style={[styles.actionPill, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Open</Text>
                  </TouchableOpacity>
                )}

                {tab === 'inbox' && item.hasViewedByMe && item.allowReplay && !item.hasReplayedByMe && !item.isExpired && (
                  <TouchableOpacity
                    onPress={() => handleReplaySnap(item)}
                    style={[styles.actionPill, { backgroundColor: colors.accent }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Replay</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={!!activeSnap} animationType="fade" transparent={false} onRequestClose={() => setActiveSnap(null)}>
        <SafeAreaView style={[styles.viewerContainer, { backgroundColor: '#08060D' }]}>
          <View style={styles.viewerTop}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
              @{activeSnap?.sender.username} • {countdown}s left
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {activeSnap && (
                <TouchableOpacity onPress={() => handleReportScreenshot(activeSnap.id)}>
                  <Ionicons name="shield-outline" size={22} color="#F04BBE" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setActiveSnap(null);
                  setCountdown(0);
                  loadData();
                }}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          {activeSnap?.mediaUrl ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: sanitizeMediaUrl(activeSnap.mediaUrl) }} style={styles.viewerImg} resizeMode="contain" />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: FILTERS.find((f) => f.key === activeSnap.filter)?.tint || 'transparent' },
                ]}
              />
              {activeSnap.overlays?.map((ov) => (
                <View key={ov.id} style={styles.overlayBadge}>
                  <Text style={[styles.overlayBadgeText, ov.color ? { color: ov.color } : null]}>{ov.content}</Text>
                </View>
              ))}
              {activeSnap.caption ? (
                <View style={styles.viewerCaption}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center' }}>{activeSnap.caption}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </SafeAreaView>
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
  tabRow: {
    flexDirection: 'row',
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  captureActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  captureBtn: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    height: 280,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImg: { width: '100%', height: '100%' },
  overlayBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(8,6,13,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  overlayBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  label: { fontWeight: '700', fontSize: 13, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  sendBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  snapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  viewerContainer: { flex: 1 },
  viewerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  viewerImg: { width: '100%', height: '85%' },
  viewerCaption: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(21,16,29,0.85)',
    padding: 12,
    borderRadius: 14,
  },
});

