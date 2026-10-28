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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const { colors } = useThemeStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

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
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="flame" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>INFERNUX</Text>
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
