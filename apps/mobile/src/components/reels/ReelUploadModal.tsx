import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api/client';
import { uploadMediaAsset, sanitizeMediaUrl } from '../../utils/uploadHelper';
import { useFeedStore } from '../../store/useFeedStore';
import { spacing } from '../../theme/spacing';

interface ReelUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onPublished?: () => void;
}

type ReelAudience = 'all' | 'followers' | 'close_friends';

const POPULAR_HASHTAGS = [
  '#trending',
  '#reels',
  '#viral',
  '#explore',
  '#mozhi',
  '#music',
  '#comedy',
  '#dance',
  '#tech',
];

export const ReelUploadModal: React.FC<ReelUploadModalProps> = ({
  visible,
  onClose,
  onPublished,
}) => {
  const insets = useSafeAreaInsets();
  const { loadReels } = useFeedStore();

  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedCover, setSelectedCover] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [audioTitle, setAudioTitle] = useState('Original Audio');
  const [audioArtist, setAudioArtist] = useState('');
  const [audience, setAudience] = useState<ReelAudience>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not open video gallery');
    }
  };

  const handleRecordVideo = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission', 'Please allow camera access to record reels.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideo(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not launch camera');
    }
  };

  const handlePickCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedCover(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Could not pick cover image');
    }
  };

  const addHashtag = (tag: string) => {
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handlePublish = async () => {
    if (!selectedVideo) {
      Alert.alert('Required', 'Please select or record a video first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Step 1: Upload Video
      setUploadProgress(40);
      const videoUrl = await uploadMediaAsset({
        uri: selectedVideo.uri,
        type: 'video',
        mimeType: selectedVideo.mimeType || 'video/mp4',
        fileName: selectedVideo.fileName || 'reel_video.mp4',
      });

      // Step 2: Upload or default Cover Image
      setUploadProgress(70);
      let thumbnailUrl = videoUrl;
      if (selectedCover) {
        thumbnailUrl = await uploadMediaAsset({
          uri: selectedCover.uri,
          type: 'image',
          mimeType: selectedCover.mimeType || 'image/jpeg',
          fileName: selectedCover.fileName || 'cover.jpg',
        });
      }

      // Step 3: Create Reel in Backend
      setUploadProgress(90);
      const res = await api.post('/reels', {
        videoUrl,
        thumbnailUrl,
        caption: caption.trim() || undefined,
        audio: {
          title: audioTitle.trim() || 'Original Audio',
          artist: audioArtist.trim() || 'Creator',
        },
        duration: Math.min(Math.round((selectedVideo.duration || 30) / 1000), 90) || 30,
      });

      setUploadProgress(100);

      if (res.success) {
        Alert.alert('Success', 'Your Reel is now live!');
        await loadReels(true);
        if (onPublished) onPublished();
        handleClose();
      } else {
        Alert.alert('Publish Error', res.error?.message || 'Could not publish reel.');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Please check your connection and retry.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedVideo(null);
    setSelectedCover(null);
    setCaption('');
    setAudioTitle('Original Audio');
    setAudioArtist('');
    setIsUploading(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isUploading}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Reel</Text>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={isUploading || !selectedVideo}
            style={[
              styles.publishBtn,
              (!selectedVideo || isUploading) && { opacity: 0.5 },
            ]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishBtnText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Upload Progress Bar */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            <Text style={styles.progressText}>Uploading Reel... {uploadProgress}%</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Step 1 & 2: Video Selection & Preview */}
          <Text style={styles.sectionLabel}>Video (9:16 Portrait)</Text>
          {selectedVideo ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: sanitizeMediaUrl(selectedVideo.uri) }}
                style={styles.previewVideo}
                resizeMode="cover"
              />
              <View style={styles.previewOverlay}>
                <TouchableOpacity style={styles.changeMediaBtn} onPress={handlePickVideo}>
                  <Ionicons name="repeat" size={16} color="#FFFFFF" />
                  <Text style={styles.changeMediaText}>Change Video</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.selectVideoRow}>
              <TouchableOpacity style={styles.pickBox} onPress={handlePickVideo}>
                <Ionicons name="images-outline" size={32} color="#6366F1" />
                <Text style={styles.pickBoxTitle}>Choose from Gallery</Text>
                <Text style={styles.pickBoxSubtitle}>Up to 90 seconds</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickBox} onPress={handleRecordVideo}>
                <Ionicons name="videocam-outline" size={32} color="#EC4899" />
                <Text style={styles.pickBoxTitle}>Record Video</Text>
                <Text style={styles.pickBoxSubtitle}>Camera capture</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Cover Image / Thumbnail */}
          {selectedVideo && (
            <View style={styles.coverRow}>
              <View style={styles.coverTextGroup}>
                <Text style={styles.sectionLabel}>Cover Thumbnail</Text>
                <Text style={styles.helperText}>Customize the frame shown in feed</Text>
              </View>
              <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover}>
                {selectedCover ? (
                  <Image source={{ uri: sanitizeMediaUrl(selectedCover.uri) }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="image-outline" size={20} color="#8E8E93" />
                    <Text style={styles.coverPlaceholderText}>Pick Cover</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 4: Caption Input */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Write a Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="What's this reel about? Add description and tags..."
            placeholderTextColor="#8E8E93"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />

          {/* Step 5: Hashtag suggestions */}
          <Text style={styles.sectionLabel}>Trending Hashtags</Text>
          <View style={styles.hashtagsRow}>
            {POPULAR_HASHTAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.hashtagChip}
                onPress={() => addHashtag(tag)}
              >
                <Text style={styles.hashtagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 6: Audio Details */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Audio Information</Text>
          <View style={styles.audioInputRow}>
            <Ionicons name="musical-notes" size={20} color="#6366F1" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.audioInput}
              placeholder="Audio Title (e.g. Original Audio)"
              placeholderTextColor="#8E8E93"
              value={audioTitle}
              onChangeText={setAudioTitle}
            />
          </View>

          {/* Step 7: Audience Selection */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Who can view this reel?</Text>
          <View style={styles.audienceSelector}>
            {[
              { key: 'all', label: 'Everyone', icon: 'globe-outline' },
              { key: 'followers', label: 'Followers', icon: 'people-outline' },
              { key: 'close_friends', label: 'Close Friends', icon: 'star-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.audienceBtn,
                  audience === item.key && styles.audienceBtnActive,
                ]}
                onPress={() => setAudience(item.key as ReelAudience)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={audience === item.key ? '#FFFFFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.audienceBtnText,
                    audience === item.key && styles.audienceBtnTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262635',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  publishBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  progressContainer: {
    backgroundColor: '#1E1E2C',
    padding: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  selectVideoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  pickBox: {
    flex: 1,
    height: 140,
    backgroundColor: '#161622',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#38384E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pickBoxTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  pickBoxSubtitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  previewContainer: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    marginBottom: spacing.md,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  changeMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF33',
  },
  changeMediaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161622',
    padding: 12,
    borderRadius: 14,
    marginBottom: spacing.md,
  },
  coverTextGroup: {
    flex: 1,
  },
  helperText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  coverPicker: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222232',
    borderWidth: 1,
    borderColor: '#38384E',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  captionInput: {
    backgroundColor: '#161622',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#262635',
    marginBottom: spacing.md,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  hashtagChip: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303044',
  },
  hashtagText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  audioInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161622',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#262635',
    marginBottom: spacing.sm,
  },
  audioInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  audienceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  audienceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161622',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262635',
    gap: 6,
  },
  audienceBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  audienceBtnText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  audienceBtnTextActive: {
    color: '#FFFFFF',
  },
});

