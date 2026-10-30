import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Input } from './Input';
import { Button } from './Button';
import { uploadMediaAsset } from '../utils/uploadHelper';
import { spacing, borderRadius, typography } from '../theme/spacing';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onProfileUpdated,
}) => {
  const { user, updateUser } = useAuthStore();
  const { colors } = useThemeStore();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || '');
  const [coverUri, setCoverUri] = useState(user?.coverImageUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const pickImage = async (type: 'avatar' | 'cover') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingPhoto(true);
        const uploadedUrl = await uploadMediaAsset({
          uri: asset.uri,
          type: 'image',
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        setIsUploadingPhoto(false);

        if (type === 'avatar') {
          setAvatarUri(uploadedUrl);
        } else {
          setCoverUri(uploadedUrl);
        }
      }
    } catch {
      setIsUploadingPhoto(false);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        displayName: displayName.trim(),
        bio: bio.trim(),
      };
      if (phoneNumber.trim()) payload.phoneNumber = phoneNumber.trim();
      if (avatarUri) payload.avatarUrl = avatarUri;
      if (coverUri) payload.coverImageUrl = coverUri;

      const res = await api.patch('/users/profile', payload);
      setIsSaving(false);

      if (res.success && res.data) {
        updateUser(res.data);
        Alert.alert('Success', 'Profile updated successfully!');
        onProfileUpdated?.();
        onClose();
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to update profile');
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={[typography.button, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Cover Photo Picker */}
          <View style={styles.coverWrapper}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: colors.surfaceElevated }]} />
            )}
            <TouchableOpacity
              onPress={() => pickImage('cover')}
              style={styles.changeCoverBtn}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.changeCoverText}>Edit Cover</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar Photo Picker */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarContainer, { borderColor: colors.background }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarLetter}>
                    {(displayName || user?.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => pickImage('avatar')}
                style={[styles.avatarCameraBadge, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {isUploadingPhoto && (
              <View style={styles.uploadingBadge}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 6 }]}>
                  Uploading photo...
                </Text>
              </View>
            )}
          </View>

          {/* Form Fields */}
          <View style={{ marginTop: spacing.md }}>
            <Input
              label="Display Name"
              placeholder="Your name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Input
              label="Bio"
              placeholder="Tell everyone a little bit about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              style={{ height: 70 }}
            />

            <Input
              label="Phone Number"
              placeholder="+1 555 123 4567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <Button
            title={isSaving ? 'Saving Changes...' : 'Save Profile'}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  coverWrapper: {
    height: 120,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -40,
    paddingHorizontal: spacing.sm,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  uploadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    marginTop: 30,
  },
});
