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
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../src/store/useThemeStore';
import { api } from '../../src/api/client';
import { uploadMediaAsset } from '../../src/utils/uploadHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { SharedFileSummary, StorageQuotaSummary } from '@infernux/shared';

export default function SharedFilesScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [quota, setQuota] = useState<StorageQuotaSummary | null>(null);
  const [files, setFiles] = useState<SharedFileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [expiryHours, setExpiryHours] = useState<number | undefined>(24);
  const [lookupToken, setLookupToken] = useState('');
  const [lookupResult, setLookupResult] = useState<SharedFileSummary | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    const [qRes, fRes] = await Promise.all([
      api.get<StorageQuotaSummary>('/media/files/quota'),
      api.get<SharedFileSummary[]>('/media/files'),
    ]);
    if (qRes.success && qRes.data) setQuota(qRes.data);
    if (fRes.success && fRes.data) setFiles(fRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handleUploadAndShare = async () => {
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
    });
    if (pick.canceled || !pick.assets?.length) return;
    const asset = pick.assets[0];
    setUploading(true);
    try {
      const fileType = asset.type === 'video' ? 'video' : 'image';
      const uploadedUrl = await uploadMediaAsset({
        uri: asset.uri,
        type: fileType,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });

      const res = await api.post<SharedFileSummary>('/media/files', {
        fileName: asset.fileName || `shared_${Date.now()}.${fileType === 'video' ? 'mp4' : 'jpg'}`,
        mimeType: asset.mimeType || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'),
        fileSizeBytes: asset.fileSize || 250_000,
        fileUrl: uploadedUrl,
        previewUrl: fileType === 'image' ? uploadedUrl : undefined,
        scope: 'personal',
        expiresInHours: expiryHours,
      });
      if (res.success && res.data) {
        Alert.alert('File Shared', `Share token: ${res.data.shareToken}`);
        await loadFiles();
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to register shared file');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLookupToken = async () => {
    if (!lookupToken.trim()) return;
    const res = await api.get<SharedFileSummary>(`/media/files/share/${lookupToken.trim()}`);
    if (res.success && res.data) {
      setLookupResult(res.data);
    } else {
      Alert.alert('Unavailable', res.error?.message || 'Token invalid or expired');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.delete(`/media/files/${id}`);
    if (res.success) await loadFiles();
  };

  const formatMB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>File Library & Quota</Text>
        <TouchableOpacity onPress={handleUploadAndShare} disabled={uploading} style={styles.iconBtn}>
          {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {quota && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Storage Quota</Text>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>
                {formatMB(quota.usedBytes)} / {formatMB(quota.quotaBytes)} ({quota.percentUsed}%)
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.surface }]}>
              <View style={[styles.progressFill, { width: `${Math.min(quota.percentUsed, 100)}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, fontWeight: '700' }]}>
          LINK EXPIRATION FOR NEW UPLOADS
        </Text>
        <View style={styles.chipRow}>
          {[
            { label: '24 Hours', val: 24 },
            { label: '7 Days', val: 168 },
            { label: 'Never', val: undefined },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => setExpiryHours(opt.val)}
              style={[
                styles.chip,
                { backgroundColor: expiryHours === opt.val ? colors.primary : colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: expiryHours === opt.val ? '#FFFFFF' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.lookupRow}>
          <TextInput
            value={lookupToken}
            onChangeText={setLookupToken}
            placeholder="Open share token..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />
          <TouchableOpacity onPress={handleLookupToken} style={[styles.lookupBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Resolve</Text>
          </TouchableOpacity>
        </View>

        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
          Your Shared Files ({files.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : files.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>No files registered yet.</Text>
        ) : (
          files.map((f) => (
            <View key={f.id} style={[styles.fileRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-attach-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                  {f.fileName}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                  {f.category.toUpperCase()} • {formatMB(f.fileSizeBytes)} • Downloads: {f.downloadsCount}
                </Text>
                <Text style={{ color: colors.accent, fontSize: 11, marginTop: 2 }}>
                  Token: {f.shareToken} {f.isExpired ? '(EXPIRED)' : f.expiresAt ? `• Exp ${new Date(f.expiresAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(f.id)} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={19} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!lookupResult} transparent animationType="fade" onRequestClose={() => setLookupResult(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.lg }]}>
            <Text style={[typography.h3, { color: colors.text }]}>{lookupResult?.fileName}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>
              URL: {lookupResult?.fileUrl || 'Expired'}
            </Text>
            <Text style={{ color: colors.accent, fontSize: 12, marginTop: 4 }}>
              Downloads: {lookupResult?.downloadsCount}
            </Text>
            <TouchableOpacity onPress={() => setLookupResult(null)} style={[styles.lookupBtn, { backgroundColor: colors.primary, marginTop: spacing.md, alignSelf: 'flex-end' }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
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
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  lookupRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  lookupBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.md },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
