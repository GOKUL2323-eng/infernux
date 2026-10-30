import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { EditProfileModal } from '../../src/components/EditProfileModal';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import {
  CountryPickerModal,
  CountryItem,
  COUNTRIES,
} from '../../src/components/CountryPickerModal';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { UserSummary, UserProfile } from '@infernux/shared';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateUser, deleteAccount } = useAuthStore();
  const { isDarkMode, toggleTheme, colors } = useThemeStore();

  const [isPrivate, setIsPrivate] = useState(user?.privacy?.isPrivate || false);
  const [showActivity, setShowActivity] = useState(user?.privacy?.showActivityStatus !== false);

  // Notification toggles
  const [notifyLikes, setNotifyLikes] = useState(user?.notifications?.likes !== false);
  const [notifyComments, setNotifyComments] = useState(user?.notifications?.comments !== false);
  const [notifyMessages, setNotifyMessages] = useState(user?.notifications?.directMessages !== false);

  // Modals
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isBlockedModalVisible, setIsBlockedModalVisible] = useState(false);
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState<UserSummary[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Phone Number Management State
  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryItem>(COUNTRIES[0]);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [isPhoneCountryPickerVisible, setIsPhoneCountryPickerVisible] = useState(false);

  const handleRequestPhoneOtp = async () => {
    const clean = newPhone.replace(/\D/g, '');
    if (clean.length < 7) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    const res = await api.post('/auth/phone/send-otp', {
      phoneNumber: clean,
      countryCode: phoneCountry.dialCode,
      purpose: 'change_phone',
    });
    setPhoneLoading(false);
    if (res.success) {
      setPhoneStep('otp');
    } else {
      setPhoneError(res.error?.message || 'Failed to send OTP code');
    }
  };

  const handleVerifyPhoneChange = async () => {
    if (phoneOtp.length !== 6) {
      setPhoneError('Please enter all 6 digits of the OTP code');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    const res = await api.patch<UserProfile>('/auth/phone/change', {
      newPhoneNumber: newPhone.replace(/\D/g, ''),
      countryCode: phoneCountry.dialCode,
      otp: phoneOtp,
    });
    setPhoneLoading(false);
    if (res.success && res.data) {
      updateUser(res.data);
      Alert.alert('Success', 'Your phone number has been verified and updated!');
      setIsPhoneModalVisible(false);
      setPhoneStep('input');
      setNewPhone('');
      setPhoneOtp('');
    } else {
      setPhoneError(res.error?.message || 'Verification failed');
    }
  };

  const handleTogglePrivacy = async (value: boolean) => {
    setIsPrivate(value);
    const res = await api.patch('/users/privacy', { isPrivate: value });
    if (res.success && user) {
      updateUser({ privacy: { ...user.privacy, isPrivate: value } });
    }
  };

  const handleToggleActivity = async (value: boolean) => {
    setShowActivity(value);
    const res = await api.patch('/users/privacy', { showActivityStatus: value });
    if (res.success && user) {
      updateUser({ privacy: { ...user.privacy, showActivityStatus: value } });
    }
  };

  const handleToggleNotification = async (key: 'likes' | 'comments' | 'directMessages', value: boolean) => {
    if (key === 'likes') setNotifyLikes(value);
    if (key === 'comments') setNotifyComments(value);
    if (key === 'directMessages') setNotifyMessages(value);

    await api.patch('/users/notifications', { [key]: value });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    const res = await api.patch('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    setIsChangingPassword(false);

    if (res.success) {
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalVisible(false);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to change password');
    }
  };

  const openBlockedUsersModal = async () => {
    setIsBlockedModalVisible(true);
    setLoadingBlocked(true);
    const res = await api.get<UserSummary[]>('/users/blocked');
    setLoadingBlocked(false);
    if (res.success && res.data) {
      setBlockedUsers(res.data);
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    const res = await api.delete(`/users/${targetUserId}/unblock`);
    if (res.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      Alert.alert('Unblocked', 'User has been unblocked.');
    }
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'MOZHI Support & Help',
      'Need assistance with your account, private rooms, or security?\n\n• Email: support@mozhi.app\n• Response time: Within 24 hours\n• End-to-end cryptographic encryption active.',
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of MOZHI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login' as any);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your profile, posts, rooms, and conversations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            router.replace('/auth/login' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Settings & Privacy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Details */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT DETAILS</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.navRow} onPress={() => setIsEditProfileVisible(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text numberOfLines={1} style={[typography.body1, { color: colors.text }]}>Edit Profile</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.caption, { color: colors.textSecondary }]}>
                  {user?.displayName || user?.username} • Change photo & bio
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navRow} onPress={() => setIsPasswordModalVisible(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={22} color={colors.primary} />
              <Text numberOfLines={1} style={[typography.body1, { color: colors.text, marginLeft: spacing.sm, flex: 1 }]}>
                Change Password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navRow} onPress={() => setIsPhoneModalVisible(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="call-outline" size={22} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text numberOfLines={1} style={[typography.body1, { color: colors.text }]}>Phone Number</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.caption, { color: colors.textSecondary }]}>
                  {user?.phoneNumber
                    ? `${user.countryCode || '+91'} ${user.phoneNumber} • ${user.phoneVerified ? 'Verified ✅' : 'Unverified ⚠️'}`
                    : 'Not added • Tap to link & verify via SMS'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={colors.primary} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Privacy & Safety */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRIVACY & SAFETY</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed" size={22} color={colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text numberOfLines={1} style={[typography.body1, { color: colors.text }]}>Private Account</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.caption, { color: colors.textSecondary }]}>
                  Only approved followers can view your posts
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={handleTogglePrivacy}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="radio-outline" size={22} color={colors.online} />
              <View style={styles.settingTextContainer}>
                <Text numberOfLines={1} style={[typography.body1, { color: colors.text }]}>Activity Status</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[typography.caption, { color: colors.textSecondary }]}>
                  Show online status in direct messages
                </Text>
              </View>
            </View>
            <Switch
              value={showActivity}
              onValueChange={handleToggleActivity}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navRow} onPress={openBlockedUsersModal}>
            <View style={styles.rowLeft}>
              <Ionicons name="hand-left-outline" size={22} color={colors.error} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                Blocked Accounts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[typography.body1, { color: colors.text }]}>Direct & Room Messages</Text>
            <Switch
              value={notifyMessages}
              onValueChange={(val) => handleToggleNotification('directMessages', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[typography.body1, { color: colors.text }]}>Likes</Text>
            <Switch
              value={notifyLikes}
              onValueChange={(val) => handleToggleNotification('likes', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[typography.body1, { color: colors.text }]}>Comments</Text>
            <Switch
              value={notifyComments}
              onValueChange={(val) => handleToggleNotification('comments', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Vault & Media */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>VAULT & MEDIA</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/notes/private' as any)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="shield" size={22} color={colors.secondary} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                Private Notes Vault
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/music' as any)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="musical-notes" size={22} color={colors.accent} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                Music Collections
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Support & About */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT & ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.navRow} onPress={handleHelpSupport}>
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                Help & Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navRow} onPress={() => setIsAboutModalVisible(true)}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <Text style={[typography.body1, { color: colors.text, marginLeft: spacing.sm }]}>
                About MOZHI
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Account Management */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SESSION & ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.navRow} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[typography.body1, { color: colors.error, marginLeft: spacing.sm }]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.navRow} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[typography.body1, { color: colors.error, marginLeft: spacing.sm }]}>
                Delete Account Forever
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      {isEditProfileVisible && (
        <EditProfileModal
          visible={isEditProfileVisible}
          onClose={() => setIsEditProfileVisible(false)}
        />
      )}

      {/* Change Password Modal */}
      {isPasswordModalVisible && (
        <Modal
          visible={isPasswordModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsPasswordModalVisible(false)}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[typography.h3, { color: colors.text }]}>Change Password</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                leftIcon="lock-closed-outline"
              />

              <Input
                label="New Password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                leftIcon="key-outline"
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon="checkmark-circle-outline"
              />

              <Button
                title={isChangingPassword ? 'Updating Password...' : 'Update Password'}
                onPress={handleChangePassword}
                loading={isChangingPassword}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Blocked Users Modal */}
      {isBlockedModalVisible && (
        <Modal
          visible={isBlockedModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsBlockedModalVisible(false)}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setIsBlockedModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[typography.h3, { color: colors.text }]}>Blocked Accounts</Text>
              <View style={{ width: 24 }} />
            </View>

            {loadingBlocked ? (
              <View style={styles.loaderCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                renderItem={({ item }) => (
                  <View style={[styles.blockedRow, { borderBottomColor: colors.border }]}>
                    <Avatar url={item.avatarUrl} name={item.displayName} size={42} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={[typography.body1, { color: colors.text, fontWeight: '600' }]}>
                        {item.displayName || item.username}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        @{item.username}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnblockUser(item.id)}
                      style={[styles.unblockBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    >
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                        Unblock
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCenter}>
                    <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.online} />
                    <Text style={[typography.body1, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                      No blocked accounts
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>
      )}

      {/* About MOZHI Modal */}
      {isAboutModalVisible && (
        <Modal
          visible={isAboutModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setIsAboutModalVisible(false)}
        >
          <View style={styles.aboutBackdrop}>
            <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.aboutLogo}
                resizeMode="cover"
              />
              <Text style={[typography.h2, { color: colors.text, marginTop: spacing.sm }]}>MOZHI</Text>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                Version 1.0.0 (Production)
              </Text>

              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md }]}>
                MOZHI is a next-generation social messaging and media platform engineered with cryptographic protected rooms, HD WebRTC calling, short-form reels, 24-hour stories, and a private notes vault.
              </Text>

              <View style={[styles.badgeContainer, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.text, marginLeft: 6 }]}>
                  AES-256 Room Cryptography
                </Text>
              </View>

              <Button
                title="Got It"
                onPress={() => setIsAboutModalVisible(false)}
                style={{ width: '100%', marginTop: spacing.md }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Phone Number Verification Modal */}
      {isPhoneModalVisible && (
        <Modal
          visible={isPhoneModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsPhoneModalVisible(false)}
        >
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setIsPhoneModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[typography.h3, { color: colors.text }]}>Phone Number</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
              {phoneError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={[typography.caption, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
                    {phoneError}
                  </Text>
                </View>
              ) : null}

              {phoneStep === 'input' ? (
                <>
                  <Text style={[typography.body1, { color: colors.text, fontWeight: '700', marginBottom: 4 }]}>
                    Verified Mobile Number
                  </Text>
                  <Text style={[typography.body2, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                    Link and verify your phone number using genuine SMS OTP delivery:
                  </Text>

                  <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
                    New Phone Number
                  </Text>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity
                      style={[styles.countryBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      onPress={() => setIsPhoneCountryPickerVisible(true)}
                    >
                      <Text style={styles.countryFlag}>{phoneCountry.flag}</Text>
                      <Text style={[typography.body1, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                        {phoneCountry.dialCode}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.phoneTextInputWrapper,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        placeholder="98765 43210"
                        placeholderTextColor={colors.textSecondary}
                        value={newPhone}
                        onChangeText={(val: string) => {
                          setPhoneError('');
                          setNewPhone(val);
                        }}
                        keyboardType="phone-pad"
                        style={[styles.phoneTextInput, { color: colors.text }]}
                      />
                    </View>
                  </View>

                  <Button
                    title="Send SMS Verification Code"
                    onPress={handleRequestPhoneOtp}
                    loading={phoneLoading}
                    style={{ marginTop: spacing.lg }}
                  />
                </>
              ) : (
                <>
                  <Text style={[typography.body1, { color: colors.text, fontWeight: '700', marginBottom: 4 }]}>
                    Enter 6-Digit OTP Code
                  </Text>
                  <Text style={[typography.body2, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                    Enter the code sent via carrier SMS to {phoneCountry.dialCode} {newPhone}:
                  </Text>

                  <Input
                    label="Verification Code"
                    placeholder="••••••"
                    value={phoneOtp}
                    onChangeText={(val) => {
                      setPhoneError('');
                      setPhoneOtp(val);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    leftIcon="shield-checkmark-outline"
                  />

                  <Button
                    title="Verify & Link Phone Number"
                    onPress={handleVerifyPhoneChange}
                    loading={phoneLoading}
                    style={{ marginTop: spacing.lg }}
                  />

                  <TouchableOpacity
                    onPress={() => setPhoneStep('input')}
                    style={{ alignItems: 'center', marginTop: spacing.md }}
                  >
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                      Change phone number
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Country Picker Modal for Phone in Settings */}
      <CountryPickerModal
        visible={isPhoneCountryPickerVisible}
        selectedDialCode={phoneCountry.dialCode}
        onSelect={(c) => setPhoneCountry(c)}
        onClose={() => setIsPhoneCountryPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

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
  backBtn: {
    padding: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  settingTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  divider: {
    height: 0.5,
    marginHorizontal: spacing.md,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  emptyCenter: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  aboutCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 20,
  },
  phoneTextInputWrapper: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  phoneTextInput: {
    fontSize: 16,
    fontWeight: '600',
  },
});
