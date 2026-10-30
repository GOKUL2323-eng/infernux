import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../src/store/useChatStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { joinRoomByKey } = useChatStore();

  const [roomKey, setRoomKey] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      // Extract key if it's a URL
      const match = text.match(/IFNX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/i);
      if (match) {
        setRoomKey(match[0].toUpperCase());
      } else {
        setRoomKey(text.trim());
      }
    }
  };

  const handleJoin = async () => {
    if (!roomKey.trim()) {
      setErrorMsg('Please enter an invitation key');
      return;
    }
    setErrorMsg('');
    setIsJoining(true);

    const result = await joinRoomByKey(roomKey.trim());
    setIsJoining(false);

    if (result) {
      Alert.alert('Joined!', `You are now a member of ${result.room.name}`, [
        {
          text: 'Open Room',
          onPress: () => {
            router.dismiss();
            router.push(`/chat/${result.conversationId}` as any);
          },
        },
      ]);
    } else {
      setErrorMsg('Invalid or expired room key');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.text }]}>Join via Room Key</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="key" size={40} color={colors.primary} />
        </View>

        <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
          Enter Room Key
        </Text>
        <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg }]}>
          Enter the secret room invitation key (e.g. IFNX-XXXX-XXXX-XXXX) provided by the room administrator.
        </Text>

        {errorMsg ? (
          <View style={[styles.errorBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: 6 }]}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="IFNX-XXXX-XXXX-XXXX"
              value={roomKey}
              onChangeText={(text) => setRoomKey(text.toUpperCase())}
              autoCapitalize="characters"
              leftIcon="key-outline"
            />
          </View>
          <TouchableOpacity
            onPress={handlePaste}
            style={[styles.pasteBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
              Paste
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Verify & Join Room"
          onPress={handleJoin}
          loading={isJoining}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 0.5,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: spacing.sm,
  },
  pasteBtn: {
    height: 50,
    width: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

