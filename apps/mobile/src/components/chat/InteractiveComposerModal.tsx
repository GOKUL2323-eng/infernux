import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DisappearingMode, InteractiveMessageData } from '@infernux/shared';
import { useThemeStore } from '../../store/useThemeStore';
import { spacing } from '../../theme/spacing';

type ComposerMode = 'menu' | 'poll' | 'quiz' | 'checklist' | 'event' | 'task' | 'schedule';

interface InteractiveComposerModalProps {
  visible: boolean;
  onClose: () => void;
  assigneeOptions: Array<{ id: string; displayName: string }>;
  disappearingMode: DisappearingMode;
  onSelectDisappearingMode: (mode: DisappearingMode) => void;
  onSendInteractive: (
    contentType: any,
    content: string,
    interactiveData: InteractiveMessageData
  ) => void;
  onScheduleMessage: (content: string, scheduledForIso: string) => void;
}

export function InteractiveComposerModal({
  visible,
  onClose,
  assigneeOptions,
  disappearingMode,
  onSelectDisappearingMode,
  onSendInteractive,
  onScheduleMessage,
}: InteractiveComposerModalProps) {
  const { colors } = useThemeStore();
  const [mode, setMode] = useState<ComposerMode>('menu');
  const [title, setTitle] = useState('');
  const [field2, setField2] = useState('');
  const [field3, setField3] = useState('');
  const [scheduleMinutes, setScheduleMinutes] = useState('15');

  const resetAndClose = () => {
    setMode('menu');
    setTitle('');
    setField2('');
    setField3('');
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    if (mode === 'poll' || mode === 'quiz') {
      const opts = [field2.trim() || 'Option A', field3.trim() || 'Option B'].map((t, idx) => ({
        id: `opt_${idx + 1}`,
        text: t,
        voterIds: [],
        isCorrect: mode === 'quiz' ? idx === 0 : undefined,
      }));
      onSendInteractive(mode, title.trim(), {
        kind: mode,
        question: title.trim(),
        allowMultiple: false,
        options: opts,
      });
    } else if (mode === 'checklist') {
      const lines = (field2 || 'Review build\nShip update')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      onSendInteractive('checklist', title.trim(), {
        kind: 'checklist',
        question: title.trim(),
        checklistItems: lines.map((l, idx) => ({
          id: `chk_${idx + 1}`,
          text: l,
          completed: false,
        })),
      });
    } else if (mode === 'event') {
      const startsAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      onSendInteractive('event', title.trim(), {
        kind: 'event',
        event: {
          title: title.trim(),
          location: field2.trim() || 'MOZHI Live Stage',
          startsAt,
          rsvpGoingIds: [],
          rsvpMaybeIds: [],
          rsvpDeclinedIds: [],
        },
      });
    } else if (mode === 'task') {
      const assignee = assigneeOptions[0];
      onSendInteractive('task', title.trim(), {
        kind: 'task',
        task: {
          title: title.trim(),
          assigneeId: assignee?.id || 'me',
          assigneeDisplayName: assignee?.displayName || 'Participant',
          status: 'todo',
        },
      });
    } else if (mode === 'schedule') {
      const mins = Math.max(1, parseInt(scheduleMinutes, 10) || 15);
      onScheduleMessage(title.trim(), new Date(Date.now() + mins * 60000).toISOString());
    }

    resetAndClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={resetAndClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {mode === 'menu' ? 'Smart & Interactive Tools' : `Create ${mode.toUpperCase()}`}
            </Text>
            <TouchableOpacity onPress={mode === 'menu' ? resetAndClose : () => setMode('menu')}>
              <Ionicons name={mode === 'menu' ? 'close' : 'arrow-back'} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {mode === 'menu' ? (
            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DISAPPEARING TIMER</Text>
              <View style={styles.chipRow}>
                {(['off', '24h', '7d'] as DisappearingMode[]).map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => onSelectDisappearingMode(d)}
                    style={[
                      styles.chip,
                      {
                        borderColor: disappearingMode === d ? colors.primary : colors.border,
                        backgroundColor:
                          disappearingMode === d ? 'rgba(160,32,240,0.2)' : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
                      {d === 'off' ? 'Timer Off' : `Expire ${d}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 12 }]}>
                INTERACTIVE CARDS & SCHEDULING
              </Text>
              <View style={styles.grid}>
                {[
                  { key: 'poll' as const, icon: 'bar-chart-outline', label: 'Poll' },
                  { key: 'quiz' as const, icon: 'bulb-outline', label: 'Quiz' },
                  { key: 'checklist' as const, icon: 'checkbox-outline', label: 'Checklist' },
                  { key: 'event' as const, icon: 'calendar-outline', label: 'Event RSVP' },
                  { key: 'task' as const, icon: 'clipboard-outline', label: 'Assign Task' },
                  { key: 'schedule' as const, icon: 'time-outline', label: 'Schedule Msg' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.tile, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={() => setMode(item.key)}
                  >
                    <Ionicons name={item.icon as any} size={22} color={colors.primaryLight} />
                    <Text style={[styles.tileLabel, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View>
              <TextInput
                placeholder={
                  mode === 'schedule'
                    ? 'Message text to send later...'
                    : mode === 'event'
                    ? 'Event title...'
                    : mode === 'task'
                    ? 'Task title...'
                    : 'Question or heading...'
                }
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              />

              {(mode === 'poll' || mode === 'quiz') && (
                <>
                  <TextInput
                    placeholder={mode === 'quiz' ? 'Option 1 (Correct answer)' : 'Option 1'}
                    placeholderTextColor={colors.textMuted}
                    value={field2}
                    onChangeText={setField2}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  />
                  <TextInput
                    placeholder="Option 2"
                    placeholderTextColor={colors.textMuted}
                    value={field3}
                    onChangeText={setField3}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                  />
                </>
              )}

              {mode === 'checklist' && (
                <TextInput
                  placeholder={'Checklist items (one per line)'}
                  placeholderTextColor={colors.textMuted}
                  value={field2}
                  onChangeText={setField2}
                  multiline
                  style={[styles.input, { height: 86, textAlignVertical: 'top', color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                />
              )}

              {mode === 'event' && (
                <TextInput
                  placeholder="Location or link"
                  placeholderTextColor={colors.textMuted}
                  value={field2}
                  onChangeText={setField2}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                />
              )}

              {mode === 'schedule' && (
                <TextInput
                  placeholder="Send delay in minutes (e.g. 15)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={scheduleMinutes}
                  onChangeText={setScheduleMinutes}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                />
              )}

              <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85}>
                <LinearGradient colors={colors.gradientPrimary} style={styles.submitBtn}>
                  <Text style={styles.submitText}>
                    {mode === 'schedule' ? `Schedule (+${scheduleMinutes || 15}m)` : 'Send Card'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '30.5%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

