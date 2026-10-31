import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../api/client';
import { useFeedStore } from '../../store/useFeedStore';
import { spacing } from '../../theme/spacing';
import { ReelSummary } from '@infernux/shared';

interface ReelsOptionsSheetProps {
  visible: boolean;
  reel: ReelSummary | null;
  onClose: () => void;
  onNotInterested?: (reelId: string) => void;
}

export const ReelsOptionsSheet: React.FC<ReelsOptionsSheetProps> = ({
  visible,
  reel,
  onClose,
  onNotInterested,
}) => {
  const insets = useSafeAreaInsets();
  const { saveReel, recordReelShare } = useFeedStore();

  if (!reel) return null;

  const handleToggleSave = async () => {
    await saveReel(reel.id);
    onClose();
  };

  const handleCopyLink = async () => {
    const shareUrl = `https://mozhi.app/reel/${reel.id}`;
    await Clipboard.setStringAsync(shareUrl);
    await recordReelShare(reel.id);
    onClose();
    Alert.alert('Copied', 'Reel link copied to clipboard.');
  };

  const handleNotInterested = () => {
    if (onNotInterested) {
      onNotInterested(reel.id);
    }
    onClose();
    Alert.alert('Updated', "We'll show fewer reels like this in your feed.");
  };

  const handleReport = async () => {
    onClose();
    try {
      await api.post('/moderation/reports', {
        targetType: 'reel',
        targetId: reel.id,
        reason: 'Inappropriate or harmful content',
      });
      Alert.alert(
        'Report Received',
        'Thank you for keeping MOZHI safe. Our moderation team has been notified.'
      );
    } catch {
      Alert.alert('Report Received', 'Thank you for your report.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.dragHandle} />

          {/* Quick Actions Grid */}
          <View style={styles.gridRow}>
            <TouchableOpacity style={styles.gridItem} onPress={handleToggleSave}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={reel.isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={reel.isSaved ? '#6366F1' : '#FFFFFF'}
                />
              </View>
              <Text style={styles.gridLabel}>{reel.isSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={handleCopyLink}>
              <View style={styles.iconCircle}>
                <Ionicons name="link" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.gridLabel}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={handleNotInterested}>
              <View style={styles.iconCircle}>
                <Ionicons name="eye-off-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.gridLabel}>Not Interested</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={handleReport}>
              <View style={[styles.iconCircle, { backgroundColor: '#3A1E24' }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#FF4565" />
              </View>
              <Text style={[styles.gridLabel, { color: '#FF4565' }]}>Report</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#181824',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#262635',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A4A5A',
    alignSelf: 'center',
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  gridItem: {
    alignItems: 'center',
    width: 76,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#222232',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#303044',
    marginBottom: 6,
  },
  gridLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelBtn: {
    backgroundColor: '#222232',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

