import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useThemeStore } from '../src/store/useThemeStore';
import { useCallStore } from '../src/store/useCallStore';
import { MiniMusicPlayer } from '../src/components/MiniMusicPlayer';
import { Avatar } from '../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '../src/theme/spacing';

export default function RootLayout() {
  const { isDarkMode, colors } = useThemeStore();
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/' as any);
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="story/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="room/create" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="room/join" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="music/index" options={{ headerShown: false }} />
          <Stack.Screen name="notes/private" options={{ headerShown: false }} />
          <Stack.Screen name="notes/social" options={{ headerShown: false }} />
          <Stack.Screen name="search/index" options={{ headerShown: false }} />
          <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>

        {/* Global floating mini-player */}
        <MiniMusicPlayer />

        {/* Global incoming call alert modal */}
        {incomingCall && (
          <Modal transparent visible={!!incomingCall} animationType="slide">
            <View style={styles.incomingModalOverlay}>
              <View style={[styles.incomingModalCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Avatar url={incomingCall.initiator?.avatarUrl} name={incomingCall.initiator?.displayName} size={64} />
                <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
                  {incomingCall.initiator?.displayName || incomingCall.initiator?.username}
                </Text>
                <Text style={[typography.caption, { color: colors.primary, marginTop: spacing.xxs }]}>
                  Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call...
                </Text>
                <View style={styles.incomingActions}>
                  <TouchableOpacity
                    onPress={rejectCall}
                    style={[styles.callBtn, { backgroundColor: colors.error }]}
                  >
                    <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await acceptCall();
                      router.push(`/call/${incomingCall.id}` as any);
                    }}
                    style={[styles.callBtn, { backgroundColor: colors.success }]}
                  >
                    <Ionicons name="call" size={26} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  incomingModalCard: {
    width: '100%',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: spacing.xl,
  },
  callBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

