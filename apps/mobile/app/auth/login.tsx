import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import {
  CountryPickerModal,
  CountryItem,
  COUNTRIES,
} from '../../src/components/CountryPickerModal';
import { getLastAccount, SavedAccountInfo } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { login, sendPhoneOtp, isLoading, error } = useAuthStore();
  const { colors } = useThemeStore();

  const [authMode, setAuthMode] = useState<'phone' | 'password'>('phone');

  // Phone auth state
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0]); // India (+91)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);

  // Password auth state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [savedAccount, setSavedAccount] = useState<SavedAccountInfo | null>(null);

  useEffect(() => {
    getLastAccount().then((acc) => {
      if (acc) {
        setSavedAccount(acc);
        if (!identifier) {
          setIdentifier(acc.username);
        }
      }
    });
  }, []);

  const handleSendPhoneOtp = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      setValidationError('Please enter a valid phone number (at least 7 digits)');
      return;
    }
    setValidationError('');

    const res = await sendPhoneOtp({
      phoneNumber: cleanPhone,
      countryCode: selectedCountry.dialCode,
      purpose: 'login',
    });

    if (res && res.success) {
      router.push({
        pathname: '/auth/verify-otp' as any,
        params: {
          phoneNumber: cleanPhone,
          countryCode: selectedCountry.dialCode,
          purpose: 'login',
          maskedPhoneNumber: res.maskedPhoneNumber,
        },
      });
    }
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setValidationError('Please enter both identifier and password');
      return;
    }
    setValidationError('');

    const success = await login({
      loginIdentifier: identifier.trim(),
      password,
    });

    if (success) {
      router.replace('/' as any);
    }
  };

  const handleQuickDemoLogin = async () => {
    setValidationError('');
    const success = await login({
      loginIdentifier: 'demo_user',
      password: 'Password123!',
    });
    if (success) {
      router.replace('/' as any);
      return;
    }

    const regSuccess = await useAuthStore.getState().register({
      username: 'demo_user',
      displayName: 'Gokul (Lead Engineer)',
      email: 'demo@infernux.io',
      password: 'Password123!',
    });
    if (regSuccess) {
      router.replace('/' as any);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="cover"
          />
          <Text style={[styles.title, { color: colors.text }]}>MOZHI</Text>
          <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
            All-in-One Social Messaging & Media
          </Text>
        </View>

        {/* Error Alert */}
        {(error || validationError) ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
              {validationError || error}
            </Text>
          </View>
        ) : null}

        {/* Saved Account Quick Banner */}
        {savedAccount ? (
          <TouchableOpacity
            style={[styles.savedAccountBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => {
              setIdentifier(savedAccount.username);
              setAuthMode('password');
            }}
          >
            <Ionicons name="person-circle" size={32} color={colors.primary} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={[typography.body2, { color: colors.text, fontWeight: '700' }]}>
                {savedAccount.displayName || savedAccount.username}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Tap to re-login as @{savedAccount.username}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {/* Authentication Mode Tabs */}
        <View style={[styles.tabSelector, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              authMode === 'phone' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              setValidationError('');
              setAuthMode('phone');
            }}
          >
            <Ionicons
              name="call-outline"
              size={16}
              color={authMode === 'phone' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.button,
                { color: authMode === 'phone' ? '#FFFFFF' : colors.textSecondary, fontSize: 13 },
              ]}
            >
              Phone OTP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              authMode === 'password' && [styles.activeTabBtn, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              setValidationError('');
              setAuthMode('password');
            }}
          >
            <Ionicons
              name="key-outline"
              size={16}
              color={authMode === 'password' ? '#FFFFFF' : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.button,
                { color: authMode === 'password' ? '#FFFFFF' : colors.textSecondary, fontSize: 13 },
              ]}
            >
              Username / Password
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phone Number Authentication Form */}
        {authMode === 'phone' ? (
          <View style={styles.form}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Enter your mobile phone number to receive a real SMS OTP:
            </Text>

            <View style={styles.phoneInputRow}>
              {/* Country Code Selector */}
              <TouchableOpacity
                style={[
                  styles.countryBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={() => setIsCountryPickerVisible(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={[typography.body1, { color: colors.text, fontWeight: '700', marginLeft: 4 }]}>
                  {selectedCountry.dialCode}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {/* Number Input */}
              <View
                style={[
                  styles.phoneTextInputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <TextInput
                  placeholder="98765 43210"
                  placeholderTextColor={colors.textSecondary}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setValidationError('');
                    setPhoneNumber(val);
                  }}
                  keyboardType="phone-pad"
                  style={[styles.phoneTextInput, { color: colors.text }]}
                  autoFocus={false}
                />
              </View>
            </View>

            <Button
              title="Continue with SMS OTP"
              onPress={handleSendPhoneOtp}
              loading={isLoading}
              style={{ marginTop: spacing.md }}
            />

            <Button
              title="⚡ One-Tap Demo Sign In"
              variant="secondary"
              onPress={handleQuickDemoLogin}
              loading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : (
          /* Password Authentication Form */
          <View style={styles.form}>
            <Input
              label="Username or Email"
              placeholder="e.g. alex or alex@infernux.com"
              value={identifier}
              onChangeText={setIdentifier}
              leftIcon="person-outline"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed-outline"
              isPassword
            />

            <Button
              title="Sign In"
              onPress={handlePasswordLogin}
              loading={isLoading}
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="⚡ One-Tap Demo Sign In"
              variant="secondary"
              onPress={handleQuickDemoLogin}
              loading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register' as any)}>
            <Text style={[typography.body2, { color: colors.primary, fontWeight: '700' }]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Country Code Picker Modal */}
        <CountryPickerModal
          visible={isCountryPickerVisible}
          selectedDialCode={selectedCountry.dialCode}
          onSelect={(c) => setSelectedCountry(c)}
          onClose={() => setIsCountryPickerVisible(false)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandLogo: {
    width: 90,
    height: 90,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  savedAccountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  tabSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  form: {
    width: '100%',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
