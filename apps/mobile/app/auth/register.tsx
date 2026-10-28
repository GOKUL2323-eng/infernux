import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { spacing, typography } from '../../src/theme/spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();
  const { colors } = useThemeStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setValidationError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters with upper, lower, & digit');
      return;
    }

    setValidationError('');

    const success = await register({
      displayName: displayName.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
    });

    if (success) {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <Ionicons name="flame" size={40} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[typography.body2, { color: colors.textSecondary, marginTop: spacing.xxs }]}>
            Join the next-generation social network
          </Text>
        </View>

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
            label="Full Name / Display Name"
            placeholder="e.g. Alex Morgan"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="person-outline"
          />

          <Input
            label="Username"
            placeholder="e.g. alex_morgan"
            value={username}
            onChangeText={setUsername}
            leftIcon="at-outline"
            autoCapitalize="none"
          />

          <Input
            label="Email Address"
            placeholder="e.g. alex@example.com"
            value={email}
            onChangeText={setEmail}
            leftIcon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="Min 8 chars, 1 uppercase, 1 digit"
            value={password}
            onChangeText={setPassword}
            leftIcon="lock-closed-outline"
            isPassword
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            style={{ marginTop: spacing.sm }}
          />
        </View>

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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
