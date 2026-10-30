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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
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
import { socketClient } from '../../src/socket/socketClient';
import { uploadMediaAsset } from '../../src/utils/uploadHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { MessageSummary } from '@infernux/shared';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
  } = useChatStore();
  const { initiateCall } = useCallStore();

  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageSummary | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageSummary | null>(null);
  const [isRoomDetailsVisible, setIsRoomDetailsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversationId = id as string;
  const currentConversation = conversations.find((c) => c.id === conversationId);
  const conversationMessages = messages[conversationId] || [];
  const currentTyping = typingUsers[conversationId] || [];

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      loadMessages(conversationId);
    }
    return () => {
      setActiveConversation(null);
    };
  }, [conversationId]);

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

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const uploadedUrl = await uploadMediaAsset({
          uri: asset.uri,
          type: 'image',
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        setIsUploading(false);

        await sendMessage(conversationId, 'Shared an image', 'image', [
          { url: uploadedUrl, type: 'image' },
        ]);
      }
    } catch {
      setIsUploading(false);
      Alert.alert('Error', 'Failed to attach image');
    }
  };

  const startVoiceRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Audio recording permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.warn('Failed to start recording', err);
    }
  };

  const stopVoiceRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        const durationSec = Math.round(status.durationMillis / 1000);
        setIsUploading(true);
        const uploadedUrl = await uploadMediaAsset({
          uri,
          type: 'audio',
          mimeType: 'audio/m4a',
          fileName: 'voicenote.m4a',
        });
        setIsUploading(false);

        await sendMessage(conversationId, 'Voice Note', 'audio', [
          { url: uploadedUrl, type: 'audio', duration: durationSec },
        ]);
      }
    } catch (err) {
      console.warn('Failed to stop recording', err);
      setIsRecording(false);
      setRecording(null);
      setIsUploading(false);
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
    const otherParticipant = currentConversation?.participants.find((p) => p.id !== user?.id);
    const call = await initiateCall(
      type,
      currentConversation?.type === 'direct' ? otherParticipant?.id : undefined,
      currentConversation?.type === 'room' ? currentConversation.roomId : undefined
    );
    if (call) {
      router.push(`/call/${call.id}` as any);
    }
  };

  const renderMessageItem = ({ item }: { item: MessageSummary }) => {
    const isSender = item.senderId === user?.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => handleMessageLongPress(item)}
        style={[
          styles.messageRow,
          isSender ? styles.messageRowSender : styles.messageRowReceiver,
        ]}
      >
        {!isSender && (
          <Avatar url={item.sender.avatarUrl} name={item.sender.displayName} size={28} />
        )}
        <View
          style={[
            styles.bubble,
            isSender
              ? [styles.bubbleSender, { backgroundColor: colors.primary }]
              : [styles.bubbleReceiver, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
          ]}
        >
          {/* Audio Message */}
          {item.contentType === 'audio' && item.attachments && item.attachments[0] ? (
            <VoiceMessageBubble
              audioUrl={item.attachments[0].url}
              duration={item.attachments[0].duration}
              isSender={isSender}
            />
          ) : item.contentType === 'image' && item.attachments && item.attachments[0] ? (
            /* Image Attachment */
            <View>
              <Image source={{ uri: item.attachments[0].url }} style={styles.attachmentImage} />
              {item.content && item.content !== 'Shared an image' ? (
                <Text style={[typography.body2, { color: isSender ? '#FFFFFF' : colors.text, marginTop: 4 }]}>
                  {item.content}
                </Text>
              ) : null}
            </View>
          ) : (
            /* Plain text */
            <Text style={[typography.body1, { color: isSender ? '#FFFFFF' : colors.text }]}>
              {item.content}
            </Text>
          )}

          {/* Reactions bar under message */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsBadge}>
              {Array.from(new Set(item.reactions.map((r) => r.emoji))).map((emoji, idx) => (
                <Text key={idx} style={{ fontSize: 13, marginRight: 2 }}>{emoji}</Text>
              ))}
              <Text style={[typography.caption, { color: isSender ? '#FFFFFF' : colors.textSecondary, fontSize: 10, marginLeft: 2 }]}>
                {item.reactions.length}
              </Text>
            </View>
          )}

          {/* Timestamp & Receipts */}
          <View style={styles.msgFooter}>
            <Text
              style={[
                typography.caption,
                { color: isSender ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 10 },
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isSender && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={item.receipts?.some((r) => r.status === 'read') ? colors.online : 'rgba(255,255,255,0.7)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Avatar
          url={currentConversation?.avatarUrl}
          name={currentConversation?.title || 'Chat'}
          size={38}
        />

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => {
            if (currentConversation?.type === 'room') {
              setIsRoomDetailsVisible(true);
            }
          }}
        >
          <Text numberOfLines={1} style={[typography.body1, { color: colors.text, fontWeight: '700' }]}>
            {currentConversation?.title || 'Chat'}
          </Text>
          <Text style={[typography.caption, { color: currentConversation?.type === 'room' ? colors.primary : colors.online }]}>
            {currentConversation?.type === 'room' ? 'Protected Room • Tap for Info' : 'Active'}
          </Text>
        </TouchableOpacity>

        {currentConversation?.type === 'room' && (
          <TouchableOpacity
            onPress={() => setIsRoomDetailsVisible(true)}
            style={styles.callIcon}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => startCall('voice')} style={styles.callIcon}>
          <Ionicons name="call-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => startCall('video')} style={styles.callIcon}>
          <Ionicons name="videocam-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing indicator */}
      {currentTyping.length > 0 && (
        <View style={styles.typingRow}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {currentTyping.join(', ')} {currentTyping.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      {/* Reply Banner Preview */}
      {replyingTo && (
        <View style={[styles.replyBanner, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              Replying to @{replyingTo.sender.username}
            </Text>
            <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handlePickImage} disabled={isUploading} style={styles.inputActionBtn}>
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            placeholder={isUploading ? 'Uploading media...' : 'Type a message...'}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            editable={!isUploading}
            onChangeText={(text) => {
              setInputText(text);
              if (text.length > 0) socketClient.startTyping(conversationId);
              else socketClient.stopTyping(conversationId);
            }}
            style={[styles.textInput, { color: colors.text, backgroundColor: colors.surfaceElevated }]}
          />

          {inputText.trim().length > 0 ? (
            <TouchableOpacity onPress={handleSendText} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={startVoiceRecording}
              onPressOut={stopVoiceRecording}
              style={[
                styles.sendBtn,
                { backgroundColor: isRecording ? colors.error : colors.surfaceElevated },
              ]}
            >
              <Ionicons
                name="mic"
                size={20}
                color={isRecording ? '#FFFFFF' : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Message Long Press Modal */}
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
              {/* Emojis Reaction Row */}
              <View style={styles.emojiReactionRow}>
                {['❤️', '👍', '😂', '🔥', '😮', '😢'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReact(emoji)}
                    style={styles.reactionEmojiBtn}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity style={styles.sheetActionItem} onPress={handleCopyMessage}>
                <Ionicons name="copy-outline" size={20} color={colors.text} />
                <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                  Copy Text
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetActionItem} onPress={handleStartReply}>
                <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
                <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                  Reply
                </Text>
              </TouchableOpacity>

              {selectedMessage.senderId === user?.id && (
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleDeleteSelectedMessage}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[typography.body1, { color: colors.error, marginLeft: spacing.sm }]}>
                    Delete Message
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Room Details Modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.xxs,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  callIcon: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  messagesList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  messageRowSender: {
    justifyContent: 'flex-end',
  },
  messageRowReceiver: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: spacing.xs,
  },
  bubbleSender: {
    borderBottomRightRadius: 2,
  },
  bubbleReceiver: {
    borderBottomLeftRadius: 2,
    borderWidth: 0.5,
  },
  attachmentImage: {
    width: 220,
    height: 180,
    borderRadius: borderRadius.md,
  },
  reactionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  typingRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: 0.5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
  },
  inputActionBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  emojiReactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  reactionEmojiBtn: {
    padding: spacing.xs,
  },
  sheetDivider: {
    height: 0.5,
    marginVertical: spacing.sm,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
