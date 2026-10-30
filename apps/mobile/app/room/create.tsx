import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../src/store/useChatStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { RoomKeyBadge } from '../../src/components/RoomKeyBadge';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { RoomDetails } from '@infernux/shared';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { createRoom } = useChatStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [createdRoom, setCreatedRoom] = useState<RoomDetails | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Room name is required');
      return;
    }

    setIsCreating(true);
    const room = await createRoom({
      name: name.trim(),
      description: description.trim() || undefined,
      isPrivate,
      requiresApproval: false,
    });
    setIsCreating(false);

    if (room) {
      setCreatedRoom(room);
    } else {
      Alert.alert('Error', 'Failed to create room');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modal Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.text }]}>Create Protected Room</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {createdRoom && createdRoom.currentKey ? (
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>
            <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
              {createdRoom.name}
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Room created! Share your secure cryptographic invitation key with friends to grant access.
            </Text>

            <RoomKeyBadge
              roomName={createdRoom.name}
              keyInfo={createdRoom.currentKey}
            />

            <Button
              title="Open Room Chat"
              onPress={() => {
                router.dismiss();
                router.push('/(tabs)/chats' as any);
              }}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <View>
            <Text style={[typography.body2, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Protected rooms generate a cryptographically secure token. Only users with valid invitation keys can join and read messages.
            </Text>

            <Input
              label="Room Name"
              placeholder="e.g. VIP Alpha Lounge"
              value={name}
              onChangeText={setName}
              leftIcon="people-outline"
            />

            <Input
              label="Description (Optional)"
              placeholder="What is this room about?"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ height: 60 }}
            />

            <View style={[styles.switchRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body1, { color: colors.text, fontWeight: '600' }]}>
                  Private Room Key Enforced
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Require cryptographic invitation token to join
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <Button
              title="Generate Room & Key"
              onPress={handleCreate}
              loading={isCreating}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}
      </ScrollView>
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
    padding: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
});
