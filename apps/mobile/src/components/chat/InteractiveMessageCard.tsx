import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InteractiveMessageData, InteractMessageInput } from '@infernux/shared';
import { useThemeStore } from '../../store/useThemeStore';

interface InteractiveMessageCardProps {
  data: InteractiveMessageData;
  currentUserId?: string;
  isSender: boolean;
  onInteract: (input: InteractMessageInput) => void;
}

export function InteractiveMessageCard({
  data,
  currentUserId,
  isSender,
  onInteract,
}: InteractiveMessageCardProps) {
  const { colors } = useThemeStore();
  const cardBg = isSender ? 'rgba(0,0,0,0.28)' : colors.surfaceElevated;
  const textColor = isSender ? '#FFFFFF' : colors.text;
  const mutedColor = isSender ? 'rgba(255,255,255,0.75)' : colors.textSecondary;

  if ((data.kind === 'poll' || data.kind === 'quiz' || data.kind === 'voting_card') && data.options) {
    const totalVotes = data.options.reduce((acc, o) => acc + (o.voterIds?.length || 0), 0);
    const hasUserVoted = data.options.some((o) => currentUserId && o.voterIds?.includes(currentUserId));

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons
            name={data.kind === 'quiz' ? 'bulb-outline' : 'bar-chart-outline'}
            size={14}
            color={isSender ? '#F9A8D4' : colors.primaryLight}
          />
          <Text style={[styles.kindLabel, { color: isSender ? '#F9A8D4' : colors.primaryLight }]}>
            {data.kind === 'quiz' ? 'QUIZ' : data.kind === 'voting_card' ? 'VOTING CARD' : 'POLL'}
          </Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{data.question}</Text>

        {data.options.map((opt) => {
          const votes = opt.voterIds?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const selected = Boolean(currentUserId && opt.voterIds?.includes(currentUserId));
          const showQuizResult = data.kind === 'quiz' && hasUserVoted;

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.75}
              onPress={() => onInteract({ action: 'vote', optionId: opt.id })}
              style={[
                styles.optionBtn,
                {
                  borderColor: selected
                    ? '#F04BBE'
                    : showQuizResult && opt.isCorrect
                    ? colors.success
                    : colors.border,
                  backgroundColor: selected ? 'rgba(160,32,240,0.25)' : 'rgba(255,255,255,0.04)',
                },
              ]}
            >
              <View style={styles.optionRow}>
                <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
                  {showQuizResult && opt.isCorrect ? '✓ ' : ''}
                  {opt.text}
                </Text>
                <Text style={[styles.pctText, { color: mutedColor }]}>
                  {pct}% ({votes})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {data.kind === 'quiz' && hasUserVoted && data.explanation ? (
          <Text style={[styles.caption, { color: mutedColor }]}>{data.explanation}</Text>
        ) : (
          <Text style={[styles.caption, { color: mutedColor }]}>
            {totalVotes} vote{totalVotes === 1 ? '' : 's'} • Tap to vote
          </Text>
        )}
      </View>
    );
  }

  if (data.kind === 'checklist' && data.checklistItems) {
    const doneCount = data.checklistItems.filter((i) => i.completed).length;
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="checkbox-outline" size={14} color={isSender ? '#F9A8D4' : colors.primaryLight} />
          <Text style={[styles.kindLabel, { color: isSender ? '#F9A8D4' : colors.primaryLight }]}>
            CHECKLIST ({doneCount}/{data.checklistItems.length})
          </Text>
        </View>
        {data.question ? <Text style={[styles.title, { color: textColor }]}>{data.question}</Text> : null}

        {data.checklistItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.checkRow}
            onPress={() => onInteract({ action: 'toggle_checklist', itemId: item.id })}
          >
            <Ionicons
              name={item.completed ? 'checkbox' : 'square-outline'}
              size={18}
              color={item.completed ? '#38BDF8' : mutedColor}
            />
            <Text
              style={[
                styles.checkText,
                {
                  color: item.completed ? mutedColor : textColor,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {item.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (data.kind === 'event' && data.event) {
    const { title, startsAt, location, rsvpGoingIds, rsvpMaybeIds, rsvpDeclinedIds } = data.event;
    const isGoing = Boolean(currentUserId && rsvpGoingIds.includes(currentUserId));
    const isMaybe = Boolean(currentUserId && rsvpMaybeIds.includes(currentUserId));
    const isDeclined = Boolean(currentUserId && rsvpDeclinedIds.includes(currentUserId));

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="calendar" size={14} color="#F04BBE" />
          <Text style={[styles.kindLabel, { color: '#F04BBE' }]}>EVENT INVITATION</Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.caption, { color: mutedColor }]}>
          {new Date(startsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {location ? ` • ${location}` : ''}
        </Text>
        <View style={styles.rsvpRow}>
          {[
            { key: 'going' as const, label: `Going (${rsvpGoingIds.length})`, active: isGoing },
            { key: 'maybe' as const, label: `Maybe (${rsvpMaybeIds.length})`, active: isMaybe },
            { key: 'declined' as const, label: `No (${rsvpDeclinedIds.length})`, active: isDeclined },
          ].map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.rsvpBtn,
                {
                  borderColor: btn.active ? '#F04BBE' : colors.border,
                  backgroundColor: btn.active ? 'rgba(240,75,190,0.28)' : 'rgba(255,255,255,0.05)',
                },
              ]}
              onPress={() => onInteract({ action: 'rsvp', rsvpStatus: btn.key })}
            >
              <Text style={[styles.rsvpText, { color: textColor }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (data.kind === 'task' && data.task) {
    const nextStatus =
      data.task.status === 'todo'
        ? 'in_progress'
        : data.task.status === 'in_progress'
        ? 'done'
        : 'todo';
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="clipboard-outline" size={14} color="#38BDF8" />
          <Text style={[styles.kindLabel, { color: '#38BDF8' }]}>TASK ASSIGNMENT</Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{data.task.title}</Text>
        {data.task.assigneeDisplayName ? (
          <Text style={[styles.caption, { color: mutedColor }]}>
            Assignee: {data.task.assigneeDisplayName}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.taskStatusBtn, { borderColor: colors.primaryLight }]}
          onPress={() => onInteract({ action: 'update_task', taskStatus: nextStatus })}
        >
          <Text style={[styles.taskStatusText, { color: textColor }]}>
            Status: {data.task.status.replace('_', ' ').toUpperCase()} (Tap to advance)
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (data.kind === 'location' && data.location) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="location" size={14} color="#F04BBE" />
          <Text style={[styles.kindLabel, { color: '#F04BBE' }]}>LOCATION CARD</Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{data.location.label}</Text>
        <Text style={[styles.caption, { color: mutedColor }]}>
          {data.location.address || `${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)}`}
        </Text>
      </View>
    );
  }

  if (data.kind === 'contact' && data.contact) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.badgeRow}>
          <Ionicons name="person-circle-outline" size={14} color="#A855F7" />
          <Text style={[styles.kindLabel, { color: '#C084FC' }]}>CONTACT CARD</Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{data.contact.displayName}</Text>
        <Text style={[styles.caption, { color: mutedColor }]}>
          {data.contact.username ? `@${data.contact.username}` : ''}{' '}
          {data.contact.phone ? `• ${data.contact.phone}` : ''}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    width: 235,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginVertical: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kindLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  caption: {
    fontSize: 11,
    marginTop: 4,
  },
  optionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkText: {
    fontSize: 13,
    flex: 1,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
  },
  rsvpBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  rsvpText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskStatusBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

