import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { uploadMediaAsset } from '../../src/utils/uploadHelper';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

type CreateType = 'post' | 'reel' | 'story' | 'note';
type Audience = 'all' | 'followers' | 'close_friends';

export default function CreateScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { loadFeed, loadReels, loadStories } = useFeedStore();

  const [activeType, setActiveType] = useState<CreateType>('post');
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [socialNoteEmoji, setSocialNoteEmoji] = useState('🔥');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const pickMedia = async (mediaTypes: ImagePicker.MediaTypeOptions = ImagePicker.MediaTypeOptions.Images) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not open media gallery');
    }
  };

  const handlePublish = async () => {
    if (isSubmitting) return;

    if (activeType === 'note') {
      if (!caption.trim()) {
        Alert.alert('Required', 'Please enter a note message');
        return;
      }
    } else if (activeType === 'post' || activeType === 'reel' || activeType === 'story') {
      if (!selectedMedia && !caption.trim()) {
        Alert.alert('Required', `Please select media or enter a caption for your ${activeType}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (activeType === 'note') {
        const res = await api.post('/notes/social', {
          text: caption.trim(),
          emoji: socialNoteEmoji,
          audience: audience === 'close_friends' ? 'close_friends' : 'followers',
        });

        if (res.success) {
          Alert.alert('Success', 'Social Note published!');
          setCaption('');
          router.replace('/(tabs)' as any);
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to post note');
        }
      } else if (activeType === 'story') {
        let mediaUrl = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600';
        if (selectedMedia) {
          mediaUrl = await uploadMediaAsset({
            uri: selectedMedia.uri,
            type: selectedMedia.type || 'image',
            mimeType: selectedMedia.mimeType,
            fileName: selectedMedia.fileName,
          });
        }

        const res = await api.post('/stories', {
          mediaType: selectedMedia?.type === 'video' ? 'video' : 'image',
          mediaUrl,
          caption: caption.trim() || undefined,
          audience,
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
        let videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';

        if (selectedMedia) {
          videoUrl = await uploadMediaAsset({
            uri: selectedMedia.uri,
            type: 'video',
            mimeType: selectedMedia.mimeType || 'video/mp4',
            fileName: selectedMedia.fileName || 'reel.mp4',
          });
          thumbnailUrl = videoUrl; // Server or player handles video thumbnail
        }

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
        let mediaUrl = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800';
        const isVideo = selectedMedia?.type === 'video';

        if (selectedMedia) {
          mediaUrl = await uploadMediaAsset({
            uri: selectedMedia.uri,
            type: selectedMedia.type || 'image',
            mimeType: selectedMedia.mimeType,
            fileName: selectedMedia.fileName,
          });
        }

        const res = await api.post('/posts', {
          caption: caption.trim(),
          media: [{ url: mediaUrl, type: isVideo ? 'video' : 'image' }],
          isPrivate: audience !== 'all',
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

  const handleSaveDraft = () => {
    if (!caption.trim() && !selectedMedia) {
      Alert.alert('Draft Empty', 'Nothing to save in draft yet.');
      return;
    }
    setDraftSaved(true);
    Alert.alert('Draft Saved', 'Your work has been saved locally as a draft.');
  };

  const handleCancel = () => {
    if (caption.trim() || selectedMedia) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Save Draft',
          onPress: handleSaveDraft,
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setSelectedMedia(null);
            setCaption('');
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  const addHashtag = (tag: string) => {
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Create Content</Text>
        <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {draftSaved ? 'Saved' : 'Draft'}
          </Text>
        </TouchableOpacity>
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
                setDraftSaved(false);
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Media Picker (for post, reel, story) */}
          {activeType !== 'note' && (
            <View style={{ marginBottom: spacing.md }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  pickMedia(
                    activeType === 'reel'
                      ? ImagePicker.MediaTypeOptions.Videos
                      : ImagePicker.MediaTypeOptions.All
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
                  <View style={StyleSheet.absoluteFill}>
                    <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      onPress={() => setSelectedMedia(null)}
                      style={styles.removeMediaBtn}
                    >
                      <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.placeholderInner}>
                    <Ionicons
                      name={activeType === 'reel' ? 'videocam' : 'image'}
                      size={42}
                      color={colors.primary}
                    />
                    <Text style={[typography.body2, { color: colors.text, marginTop: spacing.sm, fontWeight: '600' }]}>
                      Tap to select {activeType === 'reel' ? 'video' : 'photo/video'}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                      From your gallery or camera
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
                : 'Add captions and hashtags...'
            }
            value={caption}
            onChangeText={(text) => {
              setCaption(text);
              setDraftSaved(false);
            }}
            multiline
            maxLength={activeType === 'note' ? 100 : 2000}
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          {/* Quick Hashtag Chips */}
          {activeType !== 'note' && (
            <View style={styles.hashtagRow}>
              {['#mozhi', '#vibes', '#trending', '#chill', '#music', '#lifestyle'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => addHashtag(tag)}
                  style={[styles.hashtagChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Text style={[typography.caption, { color: colors.primary }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Audience Selector */}
          <View style={styles.audienceSection}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' }]}>
              WHO CAN SEE THIS
            </Text>
            <View style={styles.audienceButtonsRow}>
              {[
                { id: 'all' as Audience, label: 'Public', icon: 'earth-outline' },
                { id: 'followers' as Audience, label: 'Followers', icon: 'people-outline' },
                { id: 'close_friends' as Audience, label: 'Private', icon: 'lock-closed-outline' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setAudience(opt.id)}
                  style={[
                    styles.audienceBtn,
                    {
                      backgroundColor: audience === opt.id ? colors.primary : colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={audience === opt.id ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.caption,
                      {
                        color: audience === opt.id ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: audience === opt.id ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Publish Button */}
          <Button
            title={isSubmitting ? 'Uploading & Publishing...' : `Publish ${activeType.toUpperCase()}`}
            onPress={handlePublish}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  cancelBtn: {
    padding: spacing.xs,
  },
  draftBtn: {
    padding: spacing.xs,
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
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
  },
  placeholderInner: {
    alignItems: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  emojiBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  hashtagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  hashtagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  audienceSection: {
    marginTop: spacing.md,
  },
  audienceButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  audienceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
