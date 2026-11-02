import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCreateSheetStore } from '../../store/useCreateSheetStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useNativeDriver } from '../../utils/animationHelper';
import { spacing, typography } from '../../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CreateOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  onPress: () => void;
}

export const CreateBottomSheetModal: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const { isOpen, close } = useCreateSheetStore();

  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      isNavigatingRef.current = false;
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver,
        }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver,
        }),
      ]).start(() => {
        setVisible(false);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const backAction = () => {
      if (isOpen) {
        close();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isOpen]);

  const handleSelectOption = (action: () => void) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    close();
    setTimeout(() => {
      action();
    }, 200);
  };

  const createOptions: CreateOption[] = [
    {
      id: 'post',
      title: 'Post',
      subtitle: 'Share high-resolution photos and updates',
      icon: 'grid-outline',
      gradient: ['#A020F0', '#C026D3'],
      onPress: () => router.push({ pathname: '/(tabs)/create', params: { initialMode: 'post' } } as any),
    },
    {
      id: 'story',
      title: 'Story',
      subtitle: 'Share 24-hour disappearing photos and clips',
      icon: 'add-circle-outline',
      gradient: ['#C026D3', '#F04BBE'],
      onPress: () => router.push({ pathname: '/(tabs)/create', params: { initialMode: 'story' } } as any),
    },
    {
      id: 'reel',
      title: 'Reel',
      subtitle: 'Record and upload vertical 9:16 short video',
      icon: 'videocam-outline',
      gradient: ['#8A2BE2', '#A020F0'],
      onPress: () => router.push({ pathname: '/(tabs)/create', params: { initialMode: 'reel' } } as any),
    },
    {
      id: 'private_room',
      title: 'Private Room',
      subtitle: 'Self-destructing cryptographically secured chat',
      icon: 'shield-checkmark-outline',
      gradient: ['#A020F0', '#F04BBE'],
      onPress: () => router.push('/room/create' as any),
    },
    {
      id: 'new_chat',
      title: 'New Chat',
      subtitle: 'Find friends and start 1-on-1 private messaging',
      icon: 'chatbubble-ellipses-outline',
      gradient: ['#7B0FBB', '#A020F0'],
      onPress: () => router.push('/search' as any),
    },
    {
      id: 'social_note',
      title: 'Social Note',
      subtitle: 'Broadcast your current mood and favorite music',
      icon: 'sparkles-outline',
      gradient: ['#F04BBE', '#FF6B6B'],
      onPress: () => router.push('/notes/social' as any),
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.75],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.textMuted + '80' }]} />
          </View>

          {/* Centered Title */}
          <View style={styles.header}>
            <Text style={[typography.h3, styles.title, { color: colors.text }]}>
              Create
            </Text>
          </View>

          {/* Options List */}
          <View style={styles.optionsList}>
            {createOptions.map((opt, idx) => (
              <React.Fragment key={opt.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleSelectOption(opt.onPress)}
                  style={styles.optionRow}
                >
                  <LinearGradient
                    colors={opt.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconContainer}
                  >
                    <Ionicons name={opt.icon} size={22} color="#FFFFFF" />
                  </LinearGradient>

                  <View style={styles.optionTextContainer}>
                    <Text style={[typography.body1, styles.optionTitle, { color: colors.text }]}>
                      {opt.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
                    >
                      {opt.subtitle}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  optionsList: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  divider: {
    height: 0.5,
    marginLeft: 58,
  },
});
