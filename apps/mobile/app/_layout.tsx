import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Modal, Text, TouchableOpacity, Platform } from 'react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useThemeStore } from '../src/store/useThemeStore';
import { useCallStore } from '../src/store/useCallStore';
import { MiniMusicPlayer } from '../src/components/MiniMusicPlayer';
import { SplashScreenView } from '../src/components/navigation/SplashScreenView';
import { IncomingCallAlert } from '../src/components/call/IncomingCallAlert';
import { Avatar } from '../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography } from '../src/theme/spacing';

export default function RootLayout() {
  const { isDarkMode, colors } = useThemeStore();
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { incomingCall, acceptCall, rejectCall } = useCallStore();
  const [splashFinished, setSplashFinished] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'MOZHI';
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.head.appendChild(link);
        }
        link.type = 'image/png';
        link.href = '/assets/favicon.png';
      } catch {
        // ignore
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event?.reason;
        const name = reason?.name || '';
        const message = String(reason?.message || reason || '');
        if (
          name === 'NotSupportedError' ||
          name === 'NotAllowedError' ||
          message.includes('no supported source was found') ||
          message.includes('play() request was interrupted')
        ) {
          event.preventDefault?.();
        }
      };

      const handleGlobalError = (event: ErrorEvent) => {
        const message = String(event?.message || '');
        if (
          message.includes('NotSupportedError') ||
          message.includes('no supported source was found') ||
          message.includes('Not allowed to load local resource')
        ) {
          event.preventDefault?.();
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleGlobalError);
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleGlobalError);
      };
    }
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

  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ title: 'MOZHI', headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
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
          <Stack.Screen name="snap/index" options={{ headerShown: false }} />
          <Stack.Screen name="creator/index" options={{ headerShown: false }} />
          <Stack.Screen name="communities/index" options={{ headerShown: false }} />
          <Stack.Screen name="communities/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="audio-rooms/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="files/index" options={{ headerShown: false }} />
          <Stack.Screen name="capsules/index" options={{ headerShown: false }} />
          <Stack.Screen name="moodspace/index" options={{ headerShown: false }} />
          <Stack.Screen name="together/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="settings/security" options={{ headerShown: false }} />
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        </Stack>

        {/* Global floating mini-player */}
        <MiniMusicPlayer />

        {/* Premium Splash Screen Animation on Initial Launch */}
        {!splashFinished && (
          <SplashScreenView
            isReady={!isLoading}
            onAnimationComplete={() => setSplashFinished(true)}
          />
        )}

        {/* Global incoming call alert with ripple ring animation */}
        <IncomingCallAlert
          incomingCall={incomingCall}
          onAccept={async () => {
            if (incomingCall) {
              const callId = incomingCall.id;
              await acceptCall();
              router.push(`/call/${callId}` as any);
            }
          }}
          onReject={rejectCall}
        />
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

