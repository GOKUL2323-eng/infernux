import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MessageSummary } from '@infernux/shared';
import { useNativeDriver } from '../../utils/animationHelper';
import { sanitizeMediaUrl, sanitizeVideoUrl } from '../../utils/uploadHelper';

interface PrivateMediaViewerModalProps {
  visible: boolean;
  message: MessageSummary | null;
  conversationId: string;
  onClose: () => void;
  onConsumeViewOnce?: (messageId: string) => Promise<void>;
  onSaveMedia?: (messageId: string, mediaUrl: string) => Promise<boolean>;
  onScreenshotDetected?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PrivateMediaViewerModal: React.FC<PrivateMediaViewerModalProps> = ({
  visible,
  message,
  conversationId,
  onClose,
  onConsumeViewOnce,
  onSaveMedia,
  onScreenshotDetected,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);

  const primaryAttachment = message?.attachments && message.attachments[0];
  const isVideo = primaryAttachment?.type === 'video' || message?.contentType === 'video';
  const isViewOnce = Boolean(message?.viewOnce);
  const canSave = message?.mediaSavePolicy === 'allow_save' && !isViewOnce;

  // Video player hook (if video)
  const safeVideoUrl = sanitizeVideoUrl(primaryAttachment?.url);
  const player = useVideoPlayer(safeVideoUrl, (p) => {
    p.loop = !isViewOnce;
    p.muted = false;
    try {
      const res = (p as any).play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {
      // safe ignore
    }
  });

  // Web screenshot detection via keyboard (PrintScreen)
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        onScreenshotDetected?.();
      }
    };

    window.addEventListener('keyup', handleKeyDown);
    return () => {
      window.removeEventListener('keyup', handleKeyDown);
    };
  }, [visible, onScreenshotDetected]);

  // Countdown timer for View Once session
  useEffect(() => {
    if (!visible || !isViewOnce) return;

    setSecondsRemaining(15);
    progressAnim.setValue(1);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 15000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleCloseAndConsume();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, isViewOnce]);

  const handleCloseAndConsume = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (message && isViewOnce && onConsumeViewOnce) {
      await onConsumeViewOnce(message.id);
    }
    onClose();
  };

  const handleSaveToDevice = async () => {
    if (!primaryAttachment?.url || isSaving || hasSaved) return;

    try {
      setIsSaving(true);

      if (Platform.OS === 'web') {
        // Web direct download
        const a = document.createElement('a');
        a.href = primaryAttachment.url;
        a.download = primaryAttachment.fileName || (isVideo ? 'private_video.mp4' : 'private_photo.jpg');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Native MediaLibrary download
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Storage permission is required to save photos.');
          setIsSaving(false);
          return;
        }

        const ext = isVideo ? '.mp4' : '.jpg';
        const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).Paths?.cache?.uri || '';
        const fileUri = `${cacheDir}saved_${Date.now()}${ext}`;
        if (typeof (FileSystem as any).downloadAsync === 'function') {
          const downloadRes = await (FileSystem as any).downloadAsync(primaryAttachment.url, fileUri);
          await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
        } else {
          await MediaLibrary.saveToLibraryAsync(primaryAttachment.url);
        }
      }

      setHasSaved(true);
      if (message && onSaveMedia) {
        await onSaveMedia(message.id, primaryAttachment.url);
      }
      Alert.alert('Saved', 'Media saved to camera roll. Room participants have been notified.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save media.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible || !message || !primaryAttachment) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={handleCloseAndConsume}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCloseAndConsume} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={isViewOnce ? 'flash' : 'shield-checkmark'}
                size={14}
                color={isViewOnce ? '#FF2E63' : '#38BDF8'}
                style={{ marginRight: 5 }}
              />
              <Text style={styles.headerTitle}>
                {isViewOnce ? 'VIEW ONCE MEDIA' : 'PRIVATE MEDIA'}
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              From @{message.sender.username} • {isViewOnce ? `${secondsRemaining}s remaining` : 'Self-destruct protected'}
            </Text>
          </View>

          {/* Explicit Save Button if allowed */}
          {canSave && (
            <TouchableOpacity
              onPress={handleSaveToDevice}
              disabled={isSaving || hasSaved}
              style={[styles.saveBtn, hasSaved && styles.saveBtnDone]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name={hasSaved ? 'checkmark' : 'download-outline'} size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{hasSaved ? 'Saved' : 'Save'}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* View Once Disappearing Countdown Progress Bar */}
        {isViewOnce && (
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* Media Content */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <VideoView
              player={player}
              style={styles.fullMedia}
              contentFit="contain"
              nativeControls={true}
            />
          ) : (
            <Image
              source={{ uri: sanitizeMediaUrl(primaryAttachment.url) }}
              style={styles.fullMedia}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Bottom Privacy Notice Pill */}
        <View style={styles.bottomNoticePill}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
          <Text style={styles.bottomNoticeText}>
            {isViewOnce
              ? 'This photo will permanently self-destruct once closed.'
              : 'Leaving this private room permanently erases this media for everyone.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeBtn: {
    padding: 6,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  saveBtnDone: {
    backgroundColor: '#10B981',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    zIndex: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF2E63',
  },
  mediaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  bottomNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomNoticeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
});
