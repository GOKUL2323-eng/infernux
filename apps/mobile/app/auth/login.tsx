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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { getLastAccount, SavedAccountInfo } from '../../src/api/client';
import { spacing, typography } from '../../src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const { colors } = useThemeStore();

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

  const handleLogin = async () => {
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
      password: 'DemoPassword123!',
    });
    if (success) {
      router.replace('/' as any);
      return;
    }

    const regSuccess = await useAuthStore.getState().register({
      username: 'demo_user',
      displayName: 'Demo User',
      email: 'demo_user@mozhi.app',
      password: 'DemoPassword123!',
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

        {(error || validationError) ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: spacing.xs, flex: 1 }]}>
              {validationError || error}
            </Text>
          </View>
        ) : null}

        {savedAccount ? (
          <TouchableOpacity
            style={[styles.savedAccountBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => setIdentifier(savedAccount.username)}
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
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

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
            onPress={handleLogin}
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
    borderRadius: 8,
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
  form: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});

