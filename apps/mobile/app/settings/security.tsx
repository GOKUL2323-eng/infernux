import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/useThemeStore';
import { api, getRefreshToken } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { SecurityOverviewResponse } from '@infernux/shared';

export default function SecurityCenterScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();

  const [overview, setOverview] = useState<SecurityOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      const res = await api.get<SecurityOverviewResponse>('/security/overview');
      setOverview(res.data || null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to load security overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setBusySessionId(sessionId);
      await api.post(`/security/sessions/${sessionId}/revoke`);
      await loadOverview();
      Alert.alert('Session Revoked', 'That device session has been signed out.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to revoke session');
    } finally {
      setBusySessionId(null);
    }
  };

  const handleRevokeOthers = () => {
    Alert.alert(
      'Sign Out Other Devices',
      'Revoke all other active refresh sessions on your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Others',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentRefreshToken = getRefreshToken() || undefined;
              const res = await api.post<{ revokedCount: number }>(
                '/security/sessions/revoke-all',
                { currentRefreshToken }
              );
              await loadOverview();
              Alert.alert(
                'Done',
                `Revoked ${res.data?.revokedCount ?? 0} other active session(s).`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke sessions');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>
          Security & Privacy Center
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadOverview();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {/* Honest Security Architecture Disclosure */}
          <View
            style={[
              styles.disclosureCard,
              { backgroundColor: 'rgba(160,32,240,0.1)', borderColor: colors.primary },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primaryLight} />
              <Text
                style={{
                  color: colors.primaryLight,
                  fontWeight: '800',
                  marginLeft: 8,
                  fontSize: 13.5,
                }}
              >
                How Your Account & Media Are Protected
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18 }}>
              {overview?.securityDisclosure ||
                'Protected with bcrypt hashing, short-lived JWT access tokens, and revocable MongoDB refresh sessions.'}
            </Text>
          </View>

          {/* Active Sessions */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACTIVE SESSIONS ({overview?.sessions.length ?? 0})
            </Text>
            {(overview?.sessions.length ?? 0) > 1 && (
              <TouchableOpacity onPress={handleRevokeOthers}>
                <Text style={{ color: colors.error, fontSize: 12.5, fontWeight: '700' }}>
                  Sign out other devices
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            {overview?.sessions.length ? (
              overview.sessions.map((session, index) => (
                <View key={session.id}>
                  {index > 0 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                  <View style={styles.sessionRow}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={colors.primaryLight}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13.5 }}>
                        {session.deviceId || 'Authenticated Client'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ color: colors.textSecondary, fontSize: 11.5, marginTop: 2 }}
                      >
                        {session.userAgent || 'MOZHI App'} • IP {session.ipAddress || 'unknown'}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        Started {new Date(session.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={busySessionId === session.id}
                      onPress={() => handleRevokeSession(session.id)}
                      style={[
                        styles.revokeBtn,
                        { borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.1)' },
                      ]}
                    >
                      <Text style={{ color: colors.error, fontSize: 11.5, fontWeight: '700' }}>
                        {busySessionId === session.id ? '...' : 'Revoke'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary, padding: spacing.md, fontSize: 13 }}>
                No active refresh sessions recorded.
              </Text>
            )}
          </View>

          {/* Login Activity Audit */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs },
            ]}
          >
            RECENT LOGIN ACTIVITY
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            {overview?.loginActivity.length ? (
              overview.loginActivity.map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                  <View style={styles.sessionRow}>
                    <Ionicons
                      name={item.status === 'success' ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={item.status === 'success' ? '#10B981' : colors.error}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                        {item.status === 'success' ? 'Successful Sign-In' : 'Failed Login Attempt'}
                        {item.reason ? ` (${item.reason})` : ''}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11.5, marginTop: 2 }}>
                        {item.userAgent || 'Client'} • {item.ipAddress || 'unknown IP'}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary, padding: spacing.md, fontSize: 13 }}>
                No recent password sign-in events recorded yet.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  backBtn: { marginRight: spacing.sm, padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  disclosureCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  divider: { height: 0.5, marginHorizontal: spacing.md },
  revokeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginLeft: 8,
  },
});
