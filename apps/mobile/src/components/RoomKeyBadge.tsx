import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/useThemeStore';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { RoomKeyInfo } from '@infernux/shared';

interface RoomKeyBadgeProps {
  roomName: string;
  keyInfo: RoomKeyInfo;
  onRotate?: () => void;
  canRotate?: boolean;
}

export const RoomKeyBadge: React.FC<RoomKeyBadgeProps> = ({
  roomName,
  keyInfo,
  onRotate,
  canRotate,
}) => {
  const { colors } = useThemeStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(keyInfo.secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my private room "${roomName}" on MOZHI! Use room key: ${keyInfo.secretKey} or join here: ${keyInfo.inviteUrl}`,
        url: keyInfo.inviteUrl,
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={styles.keyTag}>
          <Ionicons name="key" size={16} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: spacing.xs }]}>
            ROOM INVITATION KEY
          </Text>
        </View>
        {canRotate && onRotate && (
          <TouchableOpacity onPress={onRotate} style={styles.rotateBtn}>
            <Ionicons name="refresh" size={14} color={colors.textSecondary} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
              Rotate Key
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.code, { color: colors.text }]}>{keyInfo.secretKey}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleCopy}
          style={[styles.btn, { backgroundColor: copied ? colors.success : colors.surface }]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={16}
            color={copied ? '#FFFFFF' : colors.text}
          />
          <Text
            style={[
              typography.caption,
              { color: copied ? '#FFFFFF' : colors.text, fontWeight: '600', marginLeft: 6 },
            ]}
          >
            {copied ? 'Copied!' : 'Copy Key'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={[styles.btn, { backgroundColor: colors.surface }]}>
          <Ionicons name="share-social-outline" size={16} color={colors.text} />
          <Text style={[typography.caption, { color: colors.text, fontWeight: '600', marginLeft: 6 }]}>
            Share Invite
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  keyTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  code: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
});
