import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';
import { useThemeStore } from '../store/useThemeStore';
import { typography, spacing } from '../theme/spacing';
import { UserSummary } from '@infernux/shared';

interface StoryRingProps {
  user: UserSummary;
  hasUnseenStories: boolean;
  onPress: () => void;
  isCurrentUser?: boolean;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  user,
  hasUnseenStories,
  onPress,
  isCurrentUser,
}) => {
  const { colors } = useThemeStore();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      <View style={styles.ringWrapper}>
        {hasUnseenStories ? (
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          >
            <View style={[styles.innerCircle, { backgroundColor: colors.background }]}>
              <Avatar url={user.avatarUrl} name={user.displayName} size={60} />
            </View>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.seenRing,
              { borderColor: isCurrentUser ? colors.border : colors.textMuted },
            ]}
          >
            <Avatar url={user.avatarUrl} name={user.displayName} size={60} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          typography.caption,
          { color: colors.text, marginTop: spacing.xs, textAlign: 'center', width: 72 },
        ]}
      >
        {isCurrentUser ? 'Your Story' : user.username}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ringWrapper: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seenRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

