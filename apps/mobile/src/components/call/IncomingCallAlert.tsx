import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../Avatar';
import { useThemeStore } from '../../store/useThemeStore';
import { spacing, borderRadius, typography } from '../../theme/spacing';
import { CallSession } from '@infernux/shared';

interface IncomingCallAlertProps {
  incomingCall: CallSession | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallAlert: React.FC<IncomingCallAlertProps> = ({
  incomingCall,
  onAccept,
  onReject,
}) => {
  const { colors } = useThemeStore();

  // Animation values for concentric pulsing rings
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const btnScaleAccept = useRef(new Animated.Value(1)).current;
  const btnScaleReject = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!incomingCall) {
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
      avatarPulse.setValue(1);
      return;
    }

    // Concentric ripple wave animations
    const createRippleAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createRippleAnim(ripple1, 0);
    const anim2 = createRippleAnim(ripple2, 600);
    const anim3 = createRippleAnim(ripple3, 1200);

    // Subtle breathing pulse for avatar
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(avatarPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();
    pulse.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      pulse.stop();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAcceptPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // ignore
    }
    Animated.sequence([
      Animated.timing(btnScaleAccept, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(btnScaleAccept, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAccept();
    });
  };

  const handleRejectPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }
    Animated.sequence([
      Animated.timing(btnScaleReject, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(btnScaleReject, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onReject();
    });
  };

  const getRippleStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.65, 0.35, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.3],
        }),
      },
    ],
  });

  return (
    <Modal transparent visible={!!incomingCall} animationType="slide">
      <View style={styles.incomingModalOverlay}>
        <View
          style={[
            styles.incomingModalCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Avatar Area with Concentric Pulsing Ripples */}
          <View style={styles.rippleArea}>
            <Animated.View
              style={[
                styles.rippleRing,
                { borderColor: colors.primary },
                getRippleStyle(ripple1),
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                { borderColor: colors.primary },
                getRippleStyle(ripple2),
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                { borderColor: colors.primary },
                getRippleStyle(ripple3),
              ]}
            />

            <Animated.View style={{ transform: [{ scale: avatarPulse }] }}>
              <Avatar
                url={incomingCall.initiator?.avatarUrl}
                name={incomingCall.initiator?.displayName}
                size={76}
              />
            </Animated.View>
          </View>

          {/* Caller Details */}
          <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
            {incomingCall.initiator?.displayName || incomingCall.initiator?.username}
          </Text>
          <Text style={[typography.body2, { color: colors.primary, marginTop: spacing.xxs, fontWeight: '600' }]}>
            Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call...
          </Text>

          {/* Action Buttons: Reject & Accept */}
          <View style={styles.incomingActions}>
            {/* Reject Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRejectPress}
              style={styles.actionBtnTouch}
            >
              <Animated.View
                style={[
                  styles.callBtn,
                  {
                    backgroundColor: colors.error,
                    transform: [{ scale: btnScaleReject }],
                  },
                ]}
              >
                <Ionicons
                  name="call"
                  size={26}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </Animated.View>
              <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAcceptPress}
              style={styles.actionBtnTouch}
            >
              <Animated.View
                style={[
                  styles.callBtn,
                  {
                    backgroundColor: colors.success,
                    transform: [{ scale: btnScaleAccept }],
                  },
                ]}
              >
                <Ionicons name="call" size={26} color="#FFFFFF" />
              </Animated.View>
              <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  incomingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  incomingModalCard: {
    width: '100%',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  rippleArea: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '85%',
    marginTop: spacing.xxl,
  },
  actionBtnTouch: {
    alignItems: 'center',
  },
  callBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});
