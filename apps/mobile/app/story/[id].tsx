import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { api } from '../../src/api/client';
import { sanitizeMediaUrl } from '../../src/utils/uploadHelper';
import { spacing, typography } from '../../src/theme/spacing';
import { StoryItem } from '@infernux/shared';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { stories } = useFeedStore();
  const { colors } = useThemeStore();

  const userGroup = stories.find((g) => g.user.id === id);
  const storyItems = userGroup ? userGroup.stories : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const currentStory: StoryItem | undefined = storyItems[currentIndex];

  useEffect(() => {
    if (currentStory) {
      api.post(`/stories/${currentStory.id}/view`);
    }
  }, [currentIndex, currentStory]);

  // Auto-advance timer
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const timer = setTimeout(() => {
      if (currentIndex < storyItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        router.back();
      }
    }, (currentStory.duration || 5) * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, isPaused, currentStory]);

  const handleNext = () => {
    if (currentIndex < storyItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !userGroup) return;

    const res = await api.post('/chats/conversations', {
      type: 'direct',
      recipientId: userGroup.user.id,
    });

    if (res.success && res.data) {
      const convId = (res.data as any).conversationId;
      await api.post(`/chats/conversations/${convId}/messages`, {
        content: `Replied to story: ${replyText.trim()}`,
        contentType: 'text',
      });
      setReplyText('');
      router.back();
      router.push(`/chat/${convId}` as any);
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (!userGroup) return;
    const res = await api.post('/chats/conversations', {
      type: 'direct',
      recipientId: userGroup.user.id,
    });
    if (res.success && res.data) {
      const convId = (res.data as any).conversationId;
      await api.post(`/chats/conversations/${convId}/messages`, {
        content: `Reacted ${emoji} to your story`,
        contentType: 'text',
      });
      Alert.alert('Reaction Sent', `Sent ${emoji} to @${userGroup.user.username}`);
    }
  };

  const handleDeleteStory = () => {
    if (!currentStory) return;
    Alert.alert('Delete Story', 'Are you sure you want to delete this story?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/stories/${currentStory.id}`);
          router.back();
        },
      },
    ]);
  };

  if (!currentStory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Story not found</Text>
      </View>
    );
  }

  const safeStoryMediaUrl = sanitizeMediaUrl(currentStory.mediaUrl);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tap zones for prev/next and hold to pause */}
      <TouchableWithoutFeedback
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: safeStoryMediaUrl }} style={styles.storyMedia} />

          {/* Left tap zone */}
          <TouchableOpacity activeOpacity={1} onPress={handlePrev} style={styles.leftTapZone} />
          {/* Right tap zone */}
          <TouchableOpacity activeOpacity={1} onPress={handleNext} style={styles.rightTapZone} />
        </View>
      </TouchableWithoutFeedback>

      {/* 1. Progress Bars */}
      <View style={styles.progressBarsRow}>
        {storyItems.map((item, idx) => {
          const isActive = idx === currentIndex;
          const isPassed = idx < currentIndex;
          return (
            <View key={item.id} style={styles.progressBarBg}>
              {isPassed ? (
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '100%' }]} />
              ) : isActive ? (
                <LinearGradient
                  colors={colors.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: '100%' }]}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {/* 2. Creator Header */}
      <View style={styles.creatorHeader}>
        <Avatar
          url={currentStory.creator?.avatarUrl}
          name={currentStory.creator?.displayName}
          size={38}
          isVerified={currentStory.creator?.isVerified}
        />
        <View style={styles.creatorInfo}>
          <View style={styles.nameRow}>
            <Text style={[typography.body2, { color: '#FFFFFF', fontWeight: '800' }]}>
              {currentStory.creator?.username}
            </Text>
            {currentStory.creator?.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {currentStory.creatorId === user?.id && (
            <TouchableOpacity onPress={handleDeleteStory} style={styles.deleteStoryBtn}>
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Caption overlay if present */}
      {currentStory.caption ? (
        <View style={[styles.captionOverlay, { backgroundColor: 'rgba(33, 21, 43, 0.75)', borderColor: colors.border }]}>
          <Text style={[typography.body1, { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }]}>
            {currentStory.caption}
          </Text>
        </View>
      ) : null}

      {/* 4. Bottom Controls */}
      {currentStory.creatorId !== user?.id ? (
        <View style={[styles.bottomContainer, { bottom: insets.bottom > 0 ? insets.bottom + 10 : 24 }]}>
          {/* Quick Reaction Emojis */}
          <View style={styles.quickEmojisRow}>
            {['❤️', '🔥', '😂', '😮', '👏'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleQuickReaction(emoji)}
                style={[
                  styles.quickEmojiBtn,
                  {
                    backgroundColor: 'rgba(33, 21, 43, 0.85)',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reply Bar */}
          <View style={styles.bottomBar}>
            <TextInput
              placeholder={`Reply to ${currentStory.creator?.username}...`}
              placeholderTextColor="rgba(183, 175, 192, 0.7)"
              value={replyText}
              onChangeText={setReplyText}
              style={[
                styles.replyInput,
                {
                  borderColor: colors.border,
                  backgroundColor: 'rgba(21, 16, 29, 0.85)',
                  color: '#FFFFFF',
                },
              ]}
            />
            {replyText.trim().length > 0 && (
              <TouchableOpacity onPress={handleSendReply} style={styles.sendReplyBtn}>
                <LinearGradient
                  colors={colors.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGradient}
                >
                  <Ionicons name="send" size={17} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.viewersCountBar,
            {
              backgroundColor: 'rgba(33, 21, 43, 0.85)',
              borderColor: colors.border,
              bottom: insets.bottom > 0 ? insets.bottom + 10 : 24,
            },
          ]}
        >
          <Ionicons name="eye-outline" size={18} color={colors.accent} />
          <Text style={[typography.caption, { color: '#FFFFFF', marginLeft: 8, fontWeight: '700' }]}>
            {currentStory.viewsCount} Viewers
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  storyMedia: {
    width,
    height,
    resizeMode: 'cover',
  },
  leftTapZone: {
    position: 'absolute',
    top: 60,
    bottom: 80,
    left: 0,
    width: width * 0.35,
  },
  rightTapZone: {
    position: 'absolute',
    top: 60,
    bottom: 80,
    right: 0,
    width: width * 0.65,
  },
  progressBarsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    gap: 4,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    zIndex: 10,
  },
  creatorInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteStoryBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  bottomContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  quickEmojisRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  quickEmojiBtn: {
    padding: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 140,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  sendReplyBtn: {
    marginLeft: spacing.sm,
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewersCountBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
});
