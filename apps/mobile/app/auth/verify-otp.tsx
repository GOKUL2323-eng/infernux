import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Button } from '../../src/components/Button';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    phoneNumber: string;
    countryCode?: string;
    purpose?: 'login' | 'register' | 'change_phone';
    maskedPhoneNumber?: string;
    username?: string;
    displayName?: string;
    password?: string;
  }>();

  const { loginWithPhone, registerWithPhone, changePhoneNumber, sendPhoneOtp, isLoading, error } =
    useAuthStore();
  const { colors } = useThemeStore();

  // Responsive OTP box calculations (guaranteed fit on small 320px screens)
  const boxWidth = Math.min(48, Math.floor((width - 64) / 6));
  const boxHeight = Math.round(boxWidth * 1.15);

  const phoneNumber = params.phoneNumber || '';
  const countryCode = params.countryCode || '+91';
  const purpose = params.purpose || 'login';
  const maskedPhone = params.maskedPhoneNumber || `${countryCode} ${phoneNumber}`;

  // 6 OTP box states
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(30);
  const [localError, setLocalError] = useState<string>('');
  const [resending, setResending] = useState<boolean>(false);

  const inputRefs = useRef<Array<any>>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleDigitChange = (value: string, index: number) => {
    setLocalError('');
    // Handle paste of complete 6-digit OTP
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...digits];
      cleanDigits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(cleanDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const cleanDigit = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    setDigits(newDigits);

    // Auto-advance to next box if digit entered
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length !== 6) {
      setLocalError('Please enter all 6 digits of your verification code');
      return;
    }

    setLocalError('');

    if (purpose === 'login') {
      const success = await loginWithPhone({
        phoneNumber,
        countryCode,
        otp,
        purpose: 'login',
      });
      if (success) {
        router.replace('/' as any);
      }
    } else if (purpose === 'register') {
      const success = await registerWithPhone({
        phoneNumber,
        countryCode,
        otp,
        username: params.username || `user_${phoneNumber.slice(-4)}`,
        displayName: params.displayName || params.username || 'MOZHI User',
        password: params.password,
        acceptedTerms: true,
      });
      if (success) {
        router.replace('/' as any);
      }
    } else if (purpose === 'change_phone') {
      const success = await changePhoneNumber({
        newPhoneNumber: phoneNumber,
        countryCode,
        otp,
      });
      if (success) {
        router.back();
      }
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setLocalError('');
    try {
      const res = await sendPhoneOtp({
        phoneNumber,
        countryCode,
        purpose,
      });
      if (res && res.success) {
        setCountdown(res.cooldownSeconds || 30);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Navigation */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header Content */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}>
            <Ionicons name="chatbox-ellipses-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
            Verification Code
          </Text>
          <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
            We sent a genuine 6-digit SMS code to
          </Text>
          <Text style={[typography.body1, { color: colors.text, fontWeight: '700', marginTop: 4 }]}>
            {maskedPhone}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              Change Phone Number
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Alert */}
        {localError || error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
              {localError || error}
            </Text>
          </View>
        ) : null}

        {/* 6 Digit Input Boxes */}
        <View style={styles.otpRow}>
          {digits.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              style={[
                styles.otpBox,
                {
                  width: boxWidth,
                  height: boxHeight,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: digit ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
              value={digit}
              onChangeText={(val) => handleDigitChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textAlign="center"
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {/* Verify Button */}
        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          loading={isLoading}
          disabled={!isComplete}
          style={{ marginTop: spacing.lg }}
        />

        {/* Resend OTP Section */}
        <View style={styles.resendRow}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>
            Didn't receive code?{' '}
          </Text>
          {countdown > 0 ? (
            <Text style={[typography.body2, { color: colors.textSecondary, fontWeight: '600' }]}>
              Resend in {countdown}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOtp} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[typography.body2, { color: colors.primary, fontWeight: '700' }]}>
                  Resend SMS OTP
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 6 }]}>
            End-to-End Cryptographic Security Active
          </Text>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    fontSize: 22,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
});
