import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Avatar } from './Avatar';
import { RoomKeyBadge } from './RoomKeyBadge';
import { spacing, borderRadius, typography } from '../theme/spacing';
import { RoomDetails, RoomMember } from '@infernux/shared';

interface RoomDetailsModalProps {
  visible: boolean;
  roomId: string;
  onClose: () => void;
  onRoomDeletedOrLeft?: () => void;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  visible,
  roomId,
  onClose,
  onRoomDeletedOrLeft,
}) => {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (visible && roomId) {
      loadRoomDetails();
    }
  }, [visible, roomId]);

  const loadRoomDetails = async () => {
    setLoading(true);
    try {
      const [roomRes, membersRes] = await Promise.all([
        api.get<RoomDetails>(`/rooms/${roomId}`),
        api.get<RoomMember[]>(`/rooms/${roomId}/members`),
      ]);

      if (roomRes.success && roomRes.data) {
        setRoom(roomRes.data);
      }
      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
    } catch (err) {
      console.warn('Failed to load room details:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = room?.ownerId === user?.id;
  const currentMember = members.find((m) => m.userId === user?.id);
  const isAdmin = isOwner || currentMember?.role === 'admin';

  const handleCopyKey = async () => {
    if (room?.currentKey?.secretKey) {
      await Clipboard.setStringAsync(room.currentKey.secretKey);
      Alert.alert('Key Copied', 'Cryptographic room key copied to clipboard.');
    }
  };

  const handleShareKey = async () => {
    if (room?.currentKey) {
      try {
        await Share.share({
          message: `Join my private room "${room.name}" on MOZHI using secret key:\n${room.currentKey.secretKey}\nOr link: ${room.currentKey.inviteUrl}`,
        });
      } catch {
        // ignore
      }
    }
  };

  const handleRotateKey = () => {
    Alert.alert(
      'Rotate Room Key?',
      'Previous keys will immediately expire. Active members remain in the room, but new invites will need this new key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate Key',
          style: 'destructive',
          onPress: async () => {
            setIsRotating(true);
            const res = await api.post<any>(`/rooms/${roomId}/rotate-key`, {});
            setIsRotating(false);
            if (res.success && res.data) {
              setRoom((prev) => (prev ? { ...prev, currentKey: res.data } : prev));
              Alert.alert('Key Rotated', 'A fresh cryptographic invitation key has been generated.');
            } else {
              Alert.alert('Error', res.error?.message || 'Failed to rotate key');
            }
          },
        },
      ]
    );
  };

  const handleUpdateRole = async (targetMember: RoomMember) => {
    if (!isOwner && !isAdmin) return;
    const newRole = targetMember.role === 'admin' ? 'member' : 'admin';
    const actionLabel = newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member';

    Alert.alert(actionLabel, `Change ${targetMember.user.displayName}'s role to ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          const res = await api.patch(`/rooms/${roomId}/members/${targetMember.userId}`, { role: newRole });
          if (res.success) {
            setMembers((prev) =>
              prev.map((m) => (m.userId === targetMember.userId ? { ...m, role: newRole } : m))
            );
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (targetMember: RoomMember) => {
    Alert.alert('Remove Member', `Remove ${targetMember.user.displayName} from this room?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const res = await api.delete(`/rooms/${roomId}/members/${targetMember.userId}`);
          if (res.success) {
            setMembers((prev) => prev.filter((m) => m.userId !== targetMember.userId));
            Alert.alert('Member Removed', `${targetMember.user.displayName} has been removed.`);
          }
        },
      },
    ]);
  };

  const handleLeaveRoom = () => {
    Alert.alert('Leave Room', 'Are you sure you want to leave this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const res = await api.post(`/rooms/${roomId}/leave`);
          if (res.success) {
            onClose();
            onRoomDeletedOrLeft?.();
          }
        },
      },
    ]);
  };

  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete Room Forever',
      'This will permanently delete this room and remove all members and messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            const res = await api.delete(`/rooms/${roomId}`);
            if (res.success) {
              onClose();
              onRoomDeletedOrLeft?.();
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text }]}>Room Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Room Info Card */}
            <View style={[styles.roomCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.roomIconWrapper}>
                <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
              </View>
              <Text style={[typography.h2, { color: colors.text, marginTop: spacing.xs }]}>
                {room?.name}
              </Text>
              {room?.description ? (
                <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                  {room.description}
                </Text>
              ) : null}
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                  {room?.isPrivate ? 'PRIVATE CRYPTOGRAPHIC ROOM' : 'PUBLIC ROOM'}
                </Text>
              </View>
            </View>

            {/* Room Key Section */}
            {room?.currentKey && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                    INVITATION KEY
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity onPress={handleRotateKey} disabled={isRotating} style={styles.rotateBtn}>
                      <Ionicons name="refresh" size={14} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.primary, marginLeft: 4, fontWeight: '700' }]}>
                        Rotate Key
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <RoomKeyBadge roomName={room.name} keyInfo={room.currentKey} />

                <View style={styles.keyActionsRow}>
                  <TouchableOpacity
                    onPress={handleCopyKey}
                    style={[styles.keyActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 6 }]}>
                      Copy Key
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShareKey}
                    style={[styles.keyActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 6 }]}>
                      Share Invite
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Members Section */}
            <View style={styles.section}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', marginBottom: spacing.xs }]}>
                MEMBERS ({members.length})
              </Text>

              {members.map((member) => {
                const isMemberOwner = member.userId === room?.ownerId;
                const isMemberAdmin = member.role === 'admin';
                const canManageThisUser = isAdmin && !isMemberOwner && member.userId !== user?.id;

                return (
                  <View
                    key={member.userId}
                    style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  >
                    <Avatar
                      url={member.user.avatarUrl}
                      name={member.user.displayName}
                      size={40}
                      isVerified={member.user.isVerified}
                    />
                    <View style={styles.memberInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[typography.body1, { color: colors.text, fontWeight: '600' }]}>
                          {member.user.displayName || member.user.username}
                        </Text>
                        {isMemberOwner && (
                          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.roleBadgeText}>Owner</Text>
                          </View>
                        )}
                        {!isMemberOwner && isMemberAdmin && (
                          <View style={[styles.roleBadge, { backgroundColor: colors.secondary }]}>
                            <Text style={styles.roleBadgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        @{member.user.username}
                      </Text>
                    </View>

                    {canManageThisUser && (
                      <View style={styles.memberActions}>
                        {isOwner && (
                          <TouchableOpacity
                            onPress={() => handleUpdateRole(member)}
                            style={styles.actionIconBtn}
                          >
                            <Ionicons
                              name={isMemberAdmin ? 'shield-outline' : 'shield-checkmark-outline'}
                              size={20}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member)}
                          style={styles.actionIconBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Leave / Delete Buttons */}
            <View style={styles.footerActions}>
              {!isOwner && (
                <TouchableOpacity
                  onPress={handleLeaveRoom}
                  style={[styles.destructiveBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.error }]}
                >
                  <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 6 }} />
                  <Text style={[typography.button, { color: colors.error }]}>Leave Room</Text>
                </TouchableOpacity>
              )}

              {isOwner && (
                <TouchableOpacity
                  onPress={handleDeleteRoom}
                  style={[styles.destructiveBtn, { backgroundColor: colors.error, borderColor: colors.error }]}
                >
                  <Ionicons name="trash" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[typography.button, { color: '#FFFFFF' }]}>Delete Room</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
  },
  roomCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  roomIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xxs,
  },
  keyActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  keyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  roleBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  footerActions: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  destructiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});

