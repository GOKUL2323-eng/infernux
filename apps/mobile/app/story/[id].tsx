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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Avatar } from '../../src/components/Avatar';
import { api } from '../../src/api/client';
import { spacing, typography } from '../../src/theme/spacing';
import { StoryItem } from '@infernux/shared';

const { width, height } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { stories } = useFeedStore();

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

    // Send direct message
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

  if (!currentStory) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF' }}>Story not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Tap zones for prev/next and hold to pause */}
      <TouchableWithoutFeedback
        onPressIn={() => setIsPaused(true)}
        onPressOut={() => setIsPaused(false)}
      >
        <View style={StyleSheet.absoluteFillObject}>
          <Image source={{ uri: currentStory.mediaUrl }} style={styles.storyMedia} />

          {/* Left tap zone */}
          <TouchableOpacity activeOpacity={1} onPress={handlePrev} style={styles.leftTapZone} />
          {/* Right tap zone */}
          <TouchableOpacity activeOpacity={1} onPress={handleNext} style={styles.rightTapZone} />
        </View>
      </TouchableWithoutFeedback>

      {/* Progress Bars */}
      <View style={styles.progressBarsRow}>
        {storyItems.map((item, idx) => (
          <View key={item.id} style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Creator Header */}
      <View style={styles.creatorHeader}>
        <Avatar
          url={currentStory.creator?.avatarUrl}
          name={currentStory.creator?.displayName}
          size={36}
        />
        <View style={styles.creatorInfo}>
          <Text style={[typography.body2, { color: '#FFFFFF', fontWeight: '700' }]}>
            {currentStory.creator?.username}
          </Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
            {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Caption overlay if present */}
      {currentStory.caption ? (
        <View style={styles.captionOverlay}>
          <Text style={[typography.body1, { color: '#FFFFFF', textAlign: 'center' }]}>
            {currentStory.caption}
          </Text>
        </View>
      ) : null}

      {/* Bottom Reply Bar */}
      {currentStory.creatorId !== user?.id ? (
        <View style={styles.bottomBar}>
          <TextInput
            placeholder={`Reply to ${currentStory.creator?.username}...`}
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={replyText}
            onChangeText={setReplyText}
            style={styles.replyInput}
          />
          {replyText.trim().length > 0 && (
            <TouchableOpacity onPress={handleSendReply} style={styles.sendReplyBtn}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.viewersCountBar}>
          <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={[typography.caption, { color: '#FFFFFF', marginLeft: 6 }]}>
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
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
  closeBtn: {
    padding: spacing.xs,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 120,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
    borderRadius: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#FFFFFF',
    paddingHorizontal: spacing.md,
  },
  sendReplyBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  viewersCountBar: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
});
