import React, { useState } from 'react';
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
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const { sendPhoneOtp, register, isLoading, error } = useAuthStore();
  const { colors } = useThemeStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0]); // India (+91)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);

  const handleRegisterWithOtp = async () => {
    if (!username.trim()) {
      setValidationError('Please choose a username');
      return;
    }

    if (username.trim().length < 2) {
      setValidationError('Username must be at least 2 characters');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      setValidationError('Please enter a valid phone number (at least 7 digits)');
      return;
    }

    if (!acceptedTerms) {
      setValidationError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setValidationError('');

    const cleanUsername = username.trim().toLowerCase();

    // Send real SMS OTP for phone verification
    const res = await sendPhoneOtp({
      phoneNumber: cleanPhone,
      countryCode: selectedCountry.dialCode,
      purpose: 'register',
    });

    if (res && res.success) {
      router.push({
        pathname: '/auth/verify-otp' as any,
        params: {
          phoneNumber: cleanPhone,
          countryCode: selectedCountry.dialCode,
          purpose: 'register',
          maskedPhoneNumber: res.maskedPhoneNumber,
          username: cleanUsername,
          displayName: displayName.trim() || cleanUsername,
          password: password || undefined,
        },
      });
    }
  };

  const handleDirectPasswordRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setValidationError('Please enter a username and password');
      return;
    }
    setValidationError('');

    const trimmedUsername = username.trim().toLowerCase();
    const success = await register({
      displayName: displayName.trim() || username.trim(),
      username: trimmedUsername,
      email: `${trimmedUsername}@mozhi.app`,
      phoneNumber: phoneNumber.trim() || undefined,
      password,
    });

    if (success) {
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
          <Text style={[styles.title, { color: colors.text }]}>Join MOZHI</Text>
          <Text style={[typography.body2, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
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

        <View style={styles.form}>
          <Input
            label="Full Name *"
            placeholder="e.g. Alex Morgan"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="person-outline"
          />

          <Input
            label="Unique Username *"
            placeholder="e.g. alex_99"
            value={username}
            onChangeText={setUsername}
            leftIcon="at-outline"
            autoCapitalize="none"
          />

          {/* Phone Number with Country Code */}
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
            Phone Number * (For real SMS OTP verification)
          </Text>
          <View style={styles.phoneInputRow}>
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
              />
            </View>
          </View>

          <Input
            label="Password (Optional)"
            placeholder="Min 4 characters (Optional)"
            value={password}
            onChangeText={setPassword}
            leftIcon="lock-closed-outline"
            isPassword
          />

          {/* Terms & Privacy acceptance */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={acceptedTerms ? 'checkbox' : 'square-outline'}
              size={22}
              color={acceptedTerms ? colors.primary : colors.textSecondary}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8, flex: 1 }]}>
              I accept the <Text style={{ color: colors.primary, fontWeight: '600' }}>Terms of Service</Text> and{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          <Button
            title="Verify Phone & Create Account"
            onPress={handleRegisterWithOtp}
            loading={isLoading}
            style={{ marginTop: spacing.md }}
          />

          <Button
            title="Create Account without Phone"
            variant="secondary"
            onPress={handleDirectPasswordRegister}
            loading={isLoading}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login' as any)}>
            <Text style={[typography.body2, { color: colors.primary, fontWeight: '700' }]}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Country Code Modal */}
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
    marginBottom: spacing.lg,
  },
  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  form: {
    width: '100%',
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
