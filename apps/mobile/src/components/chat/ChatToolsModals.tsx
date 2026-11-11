import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChatFolderSummary,
  ConversationSummary,
  FriendStreakSummary,
  MessageReminderSummary,
  SavedMessageCollectionItem,
  UpdateConversationPrefsInput,
} from '@infernux/shared';
import { useThemeStore } from '../../store/useThemeStore';
import { spacing } from '../../theme/spacing';

export function CreateFolderModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const { colors } = useThemeStore();
  const [name, setName] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.cardModal, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Chat Folder</Text>
          <TextInput
            placeholder="Folder name (e.g. Work, Close Friends)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          />
          <TouchableOpacity
            onPress={() => {
              if (!name.trim()) return;
              onCreate(name.trim());
              setName('');
              onClose();
            }}
          >
            <LinearGradient colors={colors.gradientPrimary} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Create Folder</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function SavedAndRemindersModal({
  visible,
  mode,
  savedMessages,
  reminders,
  onClose,
  onUnsave,
  onDismissReminder,
  onNavigateConversation,
}: {
  visible: boolean;
  mode: 'saved' | 'reminders' | null;
  savedMessages: SavedMessageCollectionItem[];
  reminders: MessageReminderSummary[];
  onClose: () => void;
  onUnsave: (messageId: string) => void;
  onDismissReminder: (reminderId: string) => void;
  onNavigateConversation: (conversationId: string) => void;
}) {
  const { colors } = useThemeStore();
  if (!mode) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {mode === 'saved' ? 'Personal Saved Messages' : 'Message Reminders'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            {mode === 'saved' ? (
              savedMessages.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Long-press any message to bookmark it into personal collections.
                </Text>
              ) : (
                savedMessages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      onClose();
                      onNavigateConversation(item.conversationId);
                    }}
                    style={[styles.listItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeText, { color: item.isImportant ? '#F04BBE' : colors.primaryLight }]}>
                        {item.collectionName}{item.isImportant ? ' • ★ IMPORTANT' : ''}
                      </Text>
                      <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
                        {item.message?.content || '[Attachment]'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => onUnsave(item.messageId)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )
            ) : reminders.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No active message reminders scheduled.
              </Text>
            ) : (
              reminders.map((rem) => (
                <TouchableOpacity
                  key={rem.id}
                  onPress={() => {
                    onClose();
                    onNavigateConversation(rem.conversationId);
                  }}
                  style={[styles.listItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.badgeText, { color: rem.status === 'triggered' ? '#F04BBE' : '#38BDF8' }]}>
                      {rem.status.toUpperCase()} • {new Date(rem.remindAt).toLocaleString()}
                    </Text>
                    <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
                      {rem.note || rem.messagePreview || 'Saved reminder'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onDismissReminder(rem.id)}>
                    <Ionicons name="checkmark-done-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function ConversationOrgModal({
  conversation,
  folders,
  streak,
  onClose,
  onUpdatePrefs,
  onRecoverStreak,
  onToggleStreakSettings,
}: {
  conversation: ConversationSummary | null;
  folders: ChatFolderSummary[];
  streak?: FriendStreakSummary;
  onClose: () => void;
  onUpdatePrefs: (convId: string, prefs: UpdateConversationPrefsInput) => void;
  onRecoverStreak: (streakId: string) => void;
  onToggleStreakSettings: (streakId: string, settings: { remindersEnabled?: boolean; privacyHidden?: boolean }) => void;
}) {
  const { colors } = useThemeStore();
  if (!conversation) return null;

  return (
    <Modal visible={Boolean(conversation)} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              {conversation.title || 'Chat Organization'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => onUpdatePrefs(conversation.id, { isPriority: !conversation.isPriority })}
          >
            <Ionicons name={conversation.isPriority ? 'star' : 'star-outline'} size={20} color="#F59E0B" />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {conversation.isPriority ? 'Remove from Priority' : 'Mark as Priority Chat'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => onUpdatePrefs(conversation.id, { isPinned: !conversation.isPinned })}
          >
            <Ionicons name={conversation.isPinned ? 'pin' : 'pin-outline'} size={20} color={colors.primaryLight} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {conversation.isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => onUpdatePrefs(conversation.id, { isArchived: !conversation.isArchived })}
          >
            <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              {conversation.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
            </Text>
          </TouchableOpacity>

          {folders.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.badgeText, { color: colors.textMuted, marginBottom: 6 }]}>ASSIGN TO FOLDERS</Text>
              <View style={styles.folderChipRow}>
                {folders.map((f) => {
                  const assigned = Boolean(conversation.folderIds?.includes(f.id));
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => {
                        const curr = conversation.folderIds || [];
                        const next = assigned ? curr.filter((id) => id !== f.id) : [...curr, f.id];
                        onUpdatePrefs(conversation.id, { folderIds: next });
                      }}
                      style={[
                        styles.folderChip,
                        {
                          borderColor: assigned ? colors.primary : colors.border,
                          backgroundColor: assigned ? 'rgba(160,32,240,0.22)' : colors.surfaceElevated,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                        {assigned ? '✓ ' : ''}{f.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {streak && (
            <View style={[styles.streakBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.itemText, { color: colors.text, fontWeight: '800' }]}>
                🔥 {streak.currentStreak}-Day Friend Streak (Best: {streak.longestStreak})
              </Text>
              <Text style={[styles.badgeText, { color: colors.textSecondary, marginTop: 2 }]}>
                Recoveries used this month: {streak.recoveriesUsedThisMonth}/{streak.maxRecoveriesPerMonth}
              </Text>
              <View style={styles.streakActions}>
                <TouchableOpacity
                  onPress={() => onRecoverStreak(streak.id)}
                  style={[styles.smallBtn, { borderColor: '#F04BBE' }]}
                >
                  <Text style={{ color: '#F04BBE', fontSize: 11, fontWeight: '700' }}>Recover Streak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    onToggleStreakSettings(streak.id, { remindersEnabled: !streak.remindersEnabled })
                  }
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                    {streak.remindersEnabled ? 'Reminders: ON' : 'Reminders: OFF'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    onToggleStreakSettings(streak.id, { privacyHidden: !streak.privacyHidden })
                  }
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                    {streak.privacyHidden ? 'Hidden' : 'Hide Streak'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  cardModal: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: spacing.md,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginVertical: 12,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyText: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 13,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 13.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  actionLabel: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  folderChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  streakBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  streakActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

