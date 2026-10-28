import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '../../src/store/useCallStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Avatar } from '../../src/components/Avatar';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';

export default function CallScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const {
    activeCall,
    callDuration,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isFrontCamera,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleCameraFacing,
    incrementDuration,
    endCall,
  } = useCallStore();

  useEffect(() => {
    if (!activeCall) {
      router.back();
      return;
    }

    const interval = setInterval(() => {
      incrementDuration();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  const handleEndCall = async () => {
    await endCall();
    router.back();
  };

  const isOutgoing = activeCall?.initiatorId === user?.id;
  const otherParty = isOutgoing ? activeCall?.recipient : activeCall?.initiator;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#090A0F' }]}>
      {/* Top Details */}
      <View style={styles.topSection}>
        <View style={styles.statusPill}>
          <View style={[styles.pulseDot, { backgroundColor: colors.online }]} />
          <Text style={styles.callTypeStatus}>
            {activeCall?.status === 'ringing'
              ? 'Ringing...'
              : `Connected • ${formatTimer(callDuration)}`}
          </Text>
        </View>

        <View style={styles.participantBlock}>
          <Avatar
            url={otherParty?.avatarUrl}
            name={otherParty?.displayName || 'User'}
            size={110}
            isVerified={otherParty?.isVerified}
          />
          <Text style={[typography.h2, styles.callerName]}>
            {otherParty?.displayName || otherParty?.username || 'MOZHI Caller'}
          </Text>
          <Text style={[typography.body2, styles.callSubtitle]}>
            MOZHI HD WebRTC {activeCall?.callType === 'video' ? 'Video' : 'Voice'} Call
          </Text>
        </View>
      </View>

      {/* Video Preview placeholder when in video call */}
      {activeCall?.callType === 'video' && (
        <View style={[styles.videoGrid, { backgroundColor: '#14151F' }]}>
          <View style={styles.cameraPreview}>
            <Ionicons
              name={isVideoEnabled ? 'videocam' : 'videocam-off'}
              size={36}
              color={isVideoEnabled ? colors.primary : '#666'}
            />
            <Text style={[typography.caption, { color: '#888', marginTop: 4 }]}>
              {isVideoEnabled
                ? `${isFrontCamera ? 'Front' : 'Back'} Camera Active`
                : 'Camera Disabled'}
            </Text>
          </View>
        </View>
      )}

      {/* Control Buttons Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          onPress={toggleMute}
          style={[styles.controlBtn, isMuted && { backgroundColor: '#FFFFFF' }]}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color={isMuted ? '#000000' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {activeCall?.callType === 'video' && (
          <TouchableOpacity
            onPress={toggleVideo}
            style={[styles.controlBtn, !isVideoEnabled && { backgroundColor: '#FFFFFF' }]}
          >
            <Ionicons
              name={isVideoEnabled ? 'videocam' : 'videocam-off'}
              size={24}
              color={!isVideoEnabled ? '#000000' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}

        {activeCall?.callType === 'video' && (
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.controlBtn}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={toggleSpeaker}
          style={[styles.controlBtn, isSpeakerOn && { backgroundColor: '#FFFFFF' }]}
        >
          <Ionicons
            name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
            size={24}
            color={isSpeakerOn ? '#000000' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* End Call */}
        <TouchableOpacity
          onPress={handleEndCall}
          style={[styles.endCallBtn, { backgroundColor: colors.error }]}
        >
          <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  topSection: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  callTypeStatus: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  participantBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  callerName: {
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
  callSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  videoGrid: {
    flex: 1,
    marginVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraPreview: {
    alignItems: 'center',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

