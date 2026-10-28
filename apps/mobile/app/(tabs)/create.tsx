import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useFeedStore } from '../../src/store/useFeedStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

type CreateType = 'post' | 'reel' | 'story' | 'note';

export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { loadFeed, loadReels, loadStories } = useFeedStore();

  const [activeType, setActiveType] = useState<CreateType>('post');
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [socialNoteEmoji, setSocialNoteEmoji] = useState('🔥');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickMedia = async (mediaTypes: ImagePicker.MediaTypeOptions = ImagePicker.MediaTypeOptions.Images) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedMedia(result.assets[0]);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);

    try {
      if (activeType === 'note') {
        if (!caption.trim()) {
          Alert.alert('Error', 'Please enter a note');
          setIsSubmitting(false);
          return;
        }

        const res = await api.post('/notes/social', {
          text: caption.trim(),
          emoji: socialNoteEmoji,
          audience: 'followers',
        });

        if (res.success) {
          Alert.alert('Success', 'Social Note published!');
          setCaption('');
          router.replace('/(tabs)' as any);
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to post note');
        }
      } else if (activeType === 'story') {
        const mediaUrl = selectedMedia ? selectedMedia.uri : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600';
        const res = await api.post('/stories', {
          mediaType: 'image',
          mediaUrl,
          caption: caption.trim() || undefined,
          audience: 'all',
          duration: 5,
        });

        if (res.success) {
          await loadStories();
          Alert.alert('Success', 'Story posted!');
          setSelectedMedia(null);
          setCaption('');
          router.replace('/(tabs)' as any);
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to post story');
        }
      } else if (activeType === 'reel') {
        const videoUrl = selectedMedia ? selectedMedia.uri : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        const thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';

        const res = await api.post('/reels', {
          videoUrl,
          thumbnailUrl,
          caption: caption.trim() || undefined,
          duration: 30,
        });

        if (res.success) {
          await loadReels(true);
          Alert.alert('Success', 'Reel published!');
          setSelectedMedia(null);
          setCaption('');
          router.replace('/(tabs)/reels' as any);
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to publish reel');
        }
      } else {
        // Social Post
        const mediaUrl = selectedMedia ? selectedMedia.uri : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800';

        const res = await api.post('/posts', {
          caption: caption.trim(),
          media: [{ url: mediaUrl, type: 'image' }],
        });

        if (res.success) {
          await loadFeed(true);
          Alert.alert('Success', 'Post shared to feed!');
          setSelectedMedia(null);
          setCaption('');
          router.replace('/(tabs)' as any);
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to share post');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Publishing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.text }]}>Create Content</Text>
      </View>

      {/* Mode Switcher Tabs */}
      <View style={[styles.typeSelector, { backgroundColor: colors.surfaceElevated }]}>
        {(['post', 'reel', 'story', 'note'] as CreateType[]).map((type) => {
          const isSelected = activeType === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => {
                setActiveType(type);
                setSelectedMedia(null);
              }}
              style={[
                styles.typeBtn,
                isSelected && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                    textTransform: 'capitalize',
                  },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Media Picker (for post, reel, story) */}
        {activeType !== 'note' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              pickMedia(
                activeType === 'reel'
                  ? ImagePicker.MediaTypeOptions.Videos
                  : ImagePicker.MediaTypeOptions.Images
              )
            }
            style={[
              styles.mediaPlaceholder,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            {selectedMedia ? (
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderInner}>
                <Ionicons
                  name={activeType === 'reel' ? 'videocam' : 'image'}
                  size={42}
                  color={colors.primary}
                />
                <Text style={[typography.body2, { color: colors.text, marginTop: spacing.sm, fontWeight: '600' }]}>
                  Tap to select {activeType === 'reel' ? 'video' : 'photo'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                  From your gallery or camera
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Emoji selector for Social Note */}
        {activeType === 'note' && (
          <View style={styles.emojiRow}>
            {['🔥', '✨', '🎧', '⚡', '🌙', '💫', '🖤', '🚀'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setSocialNoteEmoji(emoji)}
                style={[
                  styles.emojiBtn,
                  socialNoteEmoji === emoji && {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Caption / Text Input */}
        <Input
          label={activeType === 'note' ? 'Your Status (max 100 chars)' : 'Write a caption...'}
          placeholder={
            activeType === 'note'
              ? "What's on your mind right now?"
              : 'Add hashtags #infernux #vibes...'
          }
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={activeType === 'note' ? 100 : 2000}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Button
          title={isSubmitting ? 'Publishing...' : `Publish ${activeType.toUpperCase()}`}
          onPress={handlePublish}
          loading={isSubmitting}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing.md,
  },
  mediaPlaceholder: {
    height: 220,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderInner: {
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  emojiBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
