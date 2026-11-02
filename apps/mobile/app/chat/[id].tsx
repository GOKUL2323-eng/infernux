import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../src/store/useChatStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useCallStore } from '../../src/store/useCallStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { VoiceMessageBubble } from '../../src/components/VoiceMessageBubble';
import { RoomDetailsModal } from '../../src/components/RoomDetailsModal';
import { PrivateMediaViewerModal } from '../../src/components/chat/PrivateMediaViewerModal';
import {
  AnimatedMessageBubble,
  hasMessageAnimated,
  markMessageAsAnimated,
} from '../../src/components/chat/AnimatedMessageBubble';
import {
  AnimatedReactionBadge,
  AnimatedReactionButton,
} from '../../src/components/chat/AnimatedReactionBadge';
import { socketClient } from '../../src/socket/socketClient';
import { uploadMediaAsset, sanitizeMediaUrl } from '../../src/utils/uploadHelper';
import { useNativeDriver } from '../../src/utils/animationHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { MessageSummary } from '@infernux/shared';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '😢'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const {
    conversations,
    messages,
    loadMessages,
    sendMessage,
    deleteMessage,
    addReaction,
    setActiveConversation,
    typingUsers,
    destroyedRoomAlert,
    clearDestroyedRoomAlert,
    screenshotAlert,
    clearScreenshotAlert,
    consumeViewOnce,
    saveMedia,
    reportScreenshot,
  } = useChatStore();
  const { initiateCall } = useCallStore();

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const recordingPulse = useRef(new Animated.Value(1)).current;
  const mountTimeRef = useRef(Date.now());
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageSummary | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageSummary | null>(null);
  const [isRoomDetailsVisible, setIsRoomDetailsVisible] = useState(false);
  const [isViewOnceMode, setIsViewOnceMode] = useState(false);
  const [viewingMediaMessage, setViewingMediaMessage] = useState<MessageSummary | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const conversationId = id as string;
  const currentConversation = conversations.find((c) => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];
  const currentTyping = typingUsers[conversationId] || [];
  const isRoom = currentConversation?.type === 'room' || currentConversation?.type === 'group';
  const otherParticipant = currentConversation?.participants.find((p) => p.id !== user?.id);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      loadMessages(conversationId);
    }
    return () => {
      setActiveConversation(null);
    };
  }, [conversationId]);

  // Handle real-time room destruction when a participant leaves
  useEffect(() => {
    if (
      destroyedRoomAlert &&
      (destroyedRoomAlert.conversationId === conversationId ||
        destroyedRoomAlert.roomId === currentConversation?.roomId)
    ) {
      Alert.alert(
        'Private Room Destroyed',
        destroyedRoomAlert.message ||
          'A participant left the private room. The entire chat and all shared content have been permanently deleted for everyone.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearDestroyedRoomAlert();
              router.replace('/(tabs)/chats' as any);
            },
          },
        ]
      );
    }
  }, [destroyedRoomAlert, conversationId, currentConversation?.roomId]);

  // Web screenshot awareness listener (PrintScreen)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        reportScreenshot(conversationId, currentConversation?.roomId);
      }
    };

    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keyup', handleKey);
    };
  }, [conversationId, currentConversation?.roomId]);

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    setReplyingTo(null);
    socketClient.stopTyping(conversationId);

    const prefix = replyingTo
      ? `Replying to @${replyingTo.sender.username}: `
      : '';
    await sendMessage(conversationId, `${prefix}${text}`, 'text');
  };

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVid = asset.type === 'video';
        setIsUploading(true);
        const uploadedUrl = await uploadMediaAsset({
          uri: asset.uri,
          type: isVid ? 'video' : 'image',
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        setIsUploading(false);

        await sendMessage(
          conversationId,
          isViewOnceMode
            ? `Shared a view-once ${isVid ? 'video' : 'photo'}`
            : `Shared a ${isVid ? 'video' : 'photo'}`,
          isVid ? 'video' : 'image',
          [{ url: uploadedUrl, type: isVid ? 'video' : 'image' }],
          isViewOnceMode
        );
        if (isViewOnceMode) setIsViewOnceMode(false);
      }
    } catch {
      setIsUploading(false);
      Alert.alert('Error', 'Failed to attach media');
    }
  };

  const startVoiceRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Audio recording permission is required');
        return;
      }

      try {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch {
        // ignore
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Start pulsing recording indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 0.25,
            duration: 400,
            useNativeDriver,
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 400,
            useNativeDriver,
          }),
        ])
      ).start();
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  };

  const stopVoiceRecording = async () => {
    if (!isRecording) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingPulse.stopAnimation();
      recordingPulse.setValue(1);

      await recorder.stop();
      setIsRecording(false);
      const uri = recorder.uri;
      const finalDuration = recordingSeconds || 1;

      if (uri) {
        setIsUploading(true);
        const uploadedUrl = await uploadMediaAsset({
          uri,
          type: 'audio',
          mimeType: 'audio/m4a',
          fileName: 'voicenote.m4a',
        });
        setIsUploading(false);

        await sendMessage(conversationId, 'Voice Note', 'audio', [
          { url: uploadedUrl, type: 'audio', duration: finalDuration },
        ]);
      }
    } catch (err) {
      console.warn('Failed to stop recording', err);
      setIsRecording(false);
      setIsUploading(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingPulse.stopAnimation();
    }
  };

  const handleMessageLongPress = (item: MessageSummary) => {
    setSelectedMessage(item);
  };

  const handleReact = async (emoji: string) => {
    if (!selectedMessage) return;
    await addReaction(selectedMessage.id, conversationId, emoji);
    setSelectedMessage(null);
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    await Clipboard.setStringAsync(selectedMessage.content);
    setSelectedMessage(null);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const handleStartReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setSelectedMessage(null);
  };

  const handleDeleteSelectedMessage = () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setSelectedMessage(null);

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(msgId, conversationId);
        },
      },
    ]);
  };

  const startCall = async (type: 'voice' | 'video') => {
    const otherPart = currentConversation?.participants.find((p) => p.id !== user?.id);
    const call = await initiateCall(
      type,
      currentConversation?.type === 'direct' ? otherPart?.id : undefined,
      currentConversation?.type === 'room' ? currentConversation.roomId : undefined
    );
    if (call) {
      router.push(`/call/${call.id}` as any);
    }
  };

  const renderMessageItem = ({ item }: { item: MessageSummary }) => {
    const isSender = item.senderId === user?.id;
    const isSharedReel =
      item.contentType === 'shared_reel' ||
      (item.metadata && item.metadata.reelId);

    const messageTime = new Date(item.createdAt).getTime();
    const isNew =
      !hasMessageAnimated(item.id) &&
      messageTime > mountTimeRef.current - 2000;

    if (isNew) {
      markMessageAsAnimated(item.id);
    }

    return (
      <AnimatedMessageBubble isSender={isSender} isNew={isNew}>
        <TouchableOpacity
          activeOpacity={0.92}
          onLongPress={() => handleMessageLongPress(item)}
          style={[
            styles.messageRow,
            isSender ? styles.messageRowSender : styles.messageRowReceiver,
          ]}
        >
          {/* Receiver avatar next to bubble */}
          {!isSender && (
            <Avatar
              url={item.sender.avatarUrl}
              name={item.sender.displayName || item.sender.username}
              size={30}
            />
          )}

          <View
            style={[
              styles.bubble,
              isSender
                ? [styles.bubbleSender, { backgroundColor: colors.primary }]
                : [
                    styles.bubbleReceiver,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ],
            ]}
          >
            {/* Group sender name */}
            {!isSender && isRoom && (
              <Text style={[styles.senderUsername, { color: colors.secondary }]}>
                @{item.sender.username}
              </Text>
            )}

            {/* 1. Shared Reel Card */}
            {isSharedReel ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.sharedReelCard}
                onPress={() => router.push('/(tabs)/reels' as any)}
              >
                <View style={styles.sharedReelThumbContainer}>
                  {item.metadata?.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.metadata.thumbnailUrl }}
                      style={styles.sharedReelThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.sharedReelPlaceholder}>
                      <Ionicons name="film-outline" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.sharedReelPlayBadge}>
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.sharedReelInfo}>
                  <Text numberOfLines={1} style={styles.sharedReelCreator}>
                    @{item.metadata?.creatorUsername || 'creator'}
                  </Text>
                  <Text numberOfLines={2} style={styles.sharedReelCaption}>
                    {item.metadata?.caption || item.content || 'Shared a Reel'}
                  </Text>
                  <View style={styles.watchReelRow}>
                    <Ionicons name="play-circle" size={14} color="#6366F1" />
                    <Text style={styles.watchReelText}>Watch Reel &rarr;</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : item.viewOnce ? (
              /* Snapchat-Style View Once Message Bubble */
              item.isExpired || item.content === 'Opened' ? (
                <View style={styles.viewOnceExpiredPill}>
                  <Ionicons
                    name="square-outline"
                    size={16}
                    color={isSender ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.viewOnceExpiredText, { color: isSender ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                    Opened
                  </Text>
                </View>
              ) : isSender ? (
                <View style={styles.viewOnceSenderPill}>
                  <Ionicons name="flash" size={16} color="#FF2E63" style={{ marginRight: 6 }} />
                  <Text style={styles.viewOnceSenderText}>
                    View Once Media (Delivered)
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setViewingMediaMessage(item)}
                  style={styles.viewOnceReceiverPill}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={17} color="#FF2E63" style={{ marginRight: 6 }} />
                  <Text style={styles.viewOnceReceiverText}>
                    {item.contentType === 'video' ? 'Video • Tap to view' : 'Photo • Tap to view'}
                  </Text>
                </TouchableOpacity>
              )
            ) : item.contentType === 'audio' && item.attachments && item.attachments[0] ? (
              /* 2. Audio Voice Note Message */
              <VoiceMessageBubble
                audioUrl={item.attachments[0].url}
                duration={item.attachments[0].duration}
                isSender={isSender}
              />
            ) : item.contentType === 'image' && item.attachments && item.attachments[0] ? (
              /* 3. Image Attachment Message */
              <TouchableOpacity activeOpacity={0.9} onPress={() => setViewingMediaMessage(item)}>
                <Image
                  source={{ uri: sanitizeMediaUrl(item.attachments[0].url) }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
                {item.content && item.content !== 'Shared an image' && item.content !== 'Shared a photo' ? (
                  <Text
                    style={[
                      styles.imageCaptionText,
                      { color: isSender ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {item.content}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ) : item.contentType === 'video' && item.attachments && item.attachments[0] ? (
              /* 4. Video Attachment Message */
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setViewingMediaMessage(item)}
                style={styles.videoAttachmentCard}
              >
                <View style={styles.videoAttachmentOverlay}>
                  <Ionicons name="play-circle" size={44} color="#FFFFFF" />
                  <Text style={styles.videoAttachmentLabel}>Video Attachment</Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* 5. Standard Text Message */
              <Text
                style={[
                  styles.messageText,
                  { color: isSender ? '#FFFFFF' : colors.text },
                ]}
              >
                {item.content}
              </Text>
            )}

            {/* Reactions badge under message bubble with spring animations */}
            {item.reactions && item.reactions.length > 0 && (
              <AnimatedReactionBadge
                reactions={item.reactions}
                isSender={isSender}
                onPress={() => handleMessageLongPress(item)}
              />
            )}

            {/* Message Footer: Timestamp, Disappearing Timer, Saved Indicator & Read Receipts */}
            <View style={styles.msgFooter}>
              {item.disappearingMode && item.disappearingMode !== 'off' && (
                <Ionicons
                  name="hourglass-outline"
                  size={11}
                  color={isSender ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                  style={{ marginRight: 3 }}
                />
              )}
              {item.savedBy && item.savedBy.length > 0 && (
                <Ionicons
                  name="bookmark"
                  size={11}
                  color="#6366F1"
                  style={{ marginRight: 3 }}
                />
              )}
              <Text
                style={[
                  styles.timeText,
                  { color: isSender ? 'rgba(255,255,255,0.75)' : colors.textMuted },
                ]}
              >
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isSender && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={
                    item.receipts?.some((r) => r.status === 'read')
                      ? '#38BDF8'
                      : 'rgba(255,255,255,0.7)'
                  }
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedMessageBubble>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Instagram Direct Style Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfileRow}
          activeOpacity={0.8}
          onPress={() => {
            if (isRoom) {
              setIsRoomDetailsVisible(true);
            }
          }}
        >
          <Avatar
            url={currentConversation?.avatarUrl || otherParticipant?.avatarUrl}
            name={currentConversation?.title || otherParticipant?.displayName || 'Chat'}
            size={38}
            isOnline={otherParticipant?.isOnline}
            isVerified={otherParticipant?.isVerified}
          />

          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text numberOfLines={1} style={[styles.headerName, { color: colors.text }]}>
                {currentConversation?.title || otherParticipant?.displayName || otherParticipant?.username || 'Chat'}
              </Text>
              {otherParticipant?.isVerified && (
                <Ionicons name="checkmark-circle" size={13} color="#38BDF8" style={{ marginLeft: 3 }} />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.headerStatus,
                { color: isRoom ? colors.primary : otherParticipant?.isOnline ? colors.online : colors.textMuted },
              ]}
            >
              {isRoom
                ? '🔒 Private Room • Auto-Delete'
                : otherParticipant?.isOnline
                ? 'Active now'
                : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action icons */}
        <View style={styles.headerRightActions}>
          {isRoom && (
            <TouchableOpacity
              onPress={() => setIsRoomDetailsVisible(true)}
              style={styles.headerIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="information-circle-outline" size={23} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => startCall('voice')}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="call-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => startCall('video')}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="videocam-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Real-Time Screenshot Awareness Banner */}
      {screenshotAlert &&
        (screenshotAlert.conversationId === conversationId ||
          screenshotAlert.roomId === currentConversation?.roomId) && (
          <View style={styles.screenshotAlertBanner}>
            <Ionicons name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.screenshotAlertText}>
              📸 @{screenshotAlert.username} took a screenshot!
            </Text>
            <TouchableOpacity
              onPress={clearScreenshotAlert}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

      {/* 2. Messages Feed & Composer inside KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Realtime Typing Indicator */}
        {currentTyping.length > 0 && (
          <View style={styles.typingContainer}>
            <View style={[styles.typingDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.typingText, { color: colors.textSecondary }]}>
              {currentTyping.join(', ')} {currentTyping.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}

        {/* Reply Banner Preview */}
        {replyingTo && (
          <View style={[styles.replyBanner, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyUsername, { color: colors.primary }]}>
                Replying to @{replyingTo.sender.username}
              </Text>
              <Text numberOfLines={1} style={[styles.replyPreview, { color: colors.textSecondary }]}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Instagram Direct Style Message Input Composer */}
        <View
          style={[
            styles.inputComposer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {/* Camera / Image Attachment Button */}
          {!isRecording && (
            <TouchableOpacity
              onPress={handlePickMedia}
              disabled={isUploading}
              style={styles.composerActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* View Once Toggle Button for Private Rooms */}
          {!isRecording && isRoom && (
            <TouchableOpacity
              onPress={() => setIsViewOnceMode(!isViewOnceMode)}
              style={[
                styles.viewOnceToggleBtn,
                isViewOnceMode && styles.viewOnceToggleBtnActive,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.viewOnceBadgeCircle,
                  {
                    borderColor: isViewOnceMode ? '#FF2E63' : colors.textMuted,
                    backgroundColor: isViewOnceMode ? '#FF2E63' : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.viewOnceBadgeText,
                    { color: isViewOnceMode ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  1
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Dynamic Recording Live Waveform Bar or Message Input Field */}
          {isRecording ? (
            <View style={[styles.recordingActiveContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
              <Animated.View style={[styles.recordingLiveDot, { opacity: recordingPulse }]} />
              <Text style={[styles.recordingTimerText, { color: colors.error }]}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </Text>
              <View style={styles.recordingWavesRow}>
                {[10, 18, 14, 22, 16, 26, 12, 20, 15, 24].map((h, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.recordingWaveBar,
                      {
                        height: h,
                        backgroundColor: colors.error,
                        opacity: recordingPulse,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Release to send</Text>
            </View>
          ) : (
            <View style={[styles.inputPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <TextInput
                placeholder={isUploading ? 'Uploading...' : 'Message...'}
                placeholderTextColor={colors.textMuted}
                value={inputText}
                editable={!isUploading}
                multiline
                onChangeText={(text) => {
                  setInputText(text);
                  if (text.length > 0) socketClient.startTyping(conversationId);
                  else socketClient.stopTyping(conversationId);
                }}
                style={[styles.textInputField, { color: colors.text }]}
              />
            </View>
          )}

          {/* Dynamic Send / Mic Action Button */}
          {inputText.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleSendText}
              style={[styles.sendPillBtn, { backgroundColor: colors.primary }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={startVoiceRecording}
              onPressOut={stopVoiceRecording}
              style={[
                styles.composerMicBtn,
                isRecording && { backgroundColor: colors.error },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="mic"
                size={22}
                color={isRecording ? '#FFFFFF' : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* 4. Instagram Direct Message Action Sheet / Quick Reaction Bar */}
      {selectedMessage && (
        <Modal
          visible={!!selectedMessage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMessage(null)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedMessage(null)}
          >
            <View style={[styles.actionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Quick Emojis Reaction Row with Animated Pop & Float */}
              <View style={styles.emojiReactionRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <AnimatedReactionButton
                    key={emoji}
                    emoji={emoji}
                    onSelect={(selectedEmoji) => handleReact(selectedEmoji)}
                  />
                ))}
              </View>

              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

              {/* Actions List */}
              <TouchableOpacity style={styles.sheetActionItem} onPress={handleCopyMessage}>
                <Ionicons name="copy-outline" size={20} color={colors.text} />
                <Text style={[styles.sheetActionText, { color: colors.text }]}>Copy Text</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetActionItem} onPress={handleStartReply}>
                <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                <Text style={[styles.sheetActionText, { color: colors.text }]}>Reply</Text>
              </TouchableOpacity>

              {selectedMessage.senderId === user?.id && (
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleDeleteSelectedMessage}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.sheetActionText, { color: colors.error }]}>Delete Message</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* 5. Room Details Modal */}
      {isRoomDetailsVisible && currentConversation?.roomId && (
        <RoomDetailsModal
          visible={isRoomDetailsVisible}
          roomId={currentConversation.roomId}
          onClose={() => setIsRoomDetailsVisible(false)}
          onRoomDeletedOrLeft={() => {
            router.replace('/(tabs)/chats' as any);
          }}
        />
      )}

      {/* 6. Snapchat-Style Private Media Viewer Modal */}
      {viewingMediaMessage && (
        <PrivateMediaViewerModal
          visible={Boolean(viewingMediaMessage)}
          message={viewingMediaMessage}
          conversationId={conversationId}
          onClose={() => setViewingMediaMessage(null)}
          onConsumeViewOnce={async (msgId) => {
            await consumeViewOnce(msgId, conversationId);
          }}
          onSaveMedia={async (msgId, mediaUrl) => {
            return await saveMedia(msgId, conversationId, mediaUrl);
          }}
          onScreenshotDetected={() => {
            reportScreenshot(conversationId, currentConversation?.roomId);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 6,
    marginRight: 2,
  },
  headerProfileRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  headerName: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  messageRowSender: {
    justifyContent: 'flex-end',
  },
  messageRowReceiver: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '76%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleSender: {
    borderBottomRightRadius: 4,
    marginRight: 4,
    marginLeft: 48,
  },
  bubbleReceiver: {
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    marginLeft: 8,
    marginRight: 48,
  },
  senderUsername: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  imageCaptionText: {
    fontSize: 14,
    marginTop: 6,
  },
  attachmentImage: {
    maxWidth: 240,
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
  },
  sharedReelCard: {
    width: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#12121C',
    borderWidth: 1,
    borderColor: '#2D2D40',
  },
  sharedReelThumbContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#000000',
  },
  sharedReelThumb: {
    width: '100%',
    height: '100%',
  },
  sharedReelPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E2C',
  },
  sharedReelPlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sharedReelInfo: {
    padding: 10,
  },
  sharedReelCreator: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 12,
  },
  sharedReelCaption: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  watchReelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  watchReelText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 11.5,
    marginLeft: 4,
  },
  reactionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  typingText: {
    fontSize: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: 0.5,
  },
  replyUsername: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  replyPreview: {
    fontSize: 11.5,
    marginTop: 1,
  },
  inputComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  composerActionBtn: {
    padding: 8,
  },
  inputPill: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 40,
    maxHeight: 100,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  textInputField: {
    fontSize: 14,
    paddingVertical: 0,
  },
  sendPillBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  composerMicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  emojiReactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  reactionEmojiBtn: {
    padding: 6,
  },
  sheetDivider: {
    height: 0.5,
    marginVertical: spacing.sm,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetActionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  recordingActiveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    minHeight: 40,
    marginHorizontal: 4,
  },
  recordingLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 10,
  },
  recordingWavesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 3,
    height: 26,
    marginRight: 8,
  },
  recordingWaveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  screenshotAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF2E63',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  screenshotAlertText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  viewOnceToggleBtn: {
    padding: 6,
    marginRight: 2,
  },
  viewOnceToggleBtnActive: {
    transform: [{ scale: 1.05 }],
  },
  viewOnceBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOnceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  viewOnceExpiredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewOnceExpiredText: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  viewOnceSenderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewOnceSenderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  viewOnceReceiverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 46, 99, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 46, 99, 0.4)',
  },
  viewOnceReceiverText: {
    color: '#FF2E63',
    fontSize: 13,
    fontWeight: '800',
  },
  videoAttachmentCard: {
    width: 220,
    height: 140,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoAttachmentOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoAttachmentLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
});
