import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import {
  AccountRole,
  ModerationLogSummary,
  ModerationReport,
  SuspensionAppealSummary,
} from '@infernux/shared';

type StaffTab = 'reports' | 'appeals' | 'logs' | 'users';

export default function ModerationAndAppealsScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user } = useAuthStore();

  const isStaff = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<StaffTab>('reports');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [appeals, setAppeals] = useState<SuspensionAppealSummary[]>([]);
  const [logs, setLogs] = useState<ModerationLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Appeal Form State
  const [appealReason, setAppealReason] = useState('');
  const [appealDetails, setAppealDetails] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Admin/Moderator User Control State
  const [targetUserId, setTargetUserId] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<AccountRole>('moderator');

  const loadData = async () => {
    try {
      const appealRes = await api.get<SuspensionAppealSummary[]>('/moderation/appeals');
      setAppeals(appealRes.data || []);

      if (isStaff) {
        const [reportsRes, logsRes] = await Promise.all([
          api.get<ModerationReport[]>(
            `/moderation/reports${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`
          ),
          api.get<ModerationLogSummary[]>('/moderation/logs'),
        ]);
        setReports(reportsRes.data || []);
        setLogs(logsRes.data || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load moderation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, isStaff]);

  const handleSubmitAppeal = async () => {
    if (appealReason.trim().length < 5) {
      Alert.alert('Required', 'Please describe why your suspension should be reviewed.');
      return;
    }
    try {
      setSubmittingAppeal(true);
      await api.post('/moderation/appeals', {
        reason: appealReason.trim(),
        details: appealDetails.trim() || undefined,
      });
      setAppealReason('');
      setAppealDetails('');
      await loadData();
      Alert.alert('Submitted', 'Your suspension appeal has been queued for staff review.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to submit appeal');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    removeTargetContent: boolean
  ) => {
    try {
      await api.post(`/moderation/reports/${reportId}/resolve`, {
        status,
        removeTargetContent,
        actionNote: removeTargetContent
          ? 'Content removed via Moderation Console'
          : `Marked ${status}`,
      });
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    }
  };

  const handleReviewAppeal = async (appealId: string, status: 'approved' | 'rejected') => {
    try {
      await api.post(`/moderation/appeals/${appealId}/review`, {
        status,
        reviewerNotes:
          status === 'approved' ? 'Approved via Staff Console' : 'Suspension upheld',
      });
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to review appeal');
    }
  };

  const handleToggleSuspend = async (suspend: boolean) => {
    if (!targetUserId.trim()) {
      Alert.alert('User ID Needed', 'Enter the target user ID.');
      return;
    }
    try {
      await api.post(`/moderation/users/${targetUserId.trim()}/suspend`, {
        suspend,
        reason: suspendReason.trim() || undefined,
      });
      Alert.alert('Updated', suspend ? 'User suspended & sessions revoked.' : 'User unsuspended.');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Operation failed');
    }
  };

  const handleSetRole = async () => {
    if (!targetUserId.trim()) {
      Alert.alert('User ID Needed', 'Enter the target user ID.');
      return;
    }
    try {
      await api.post(`/moderation/users/${targetUserId.trim()}/role`, { role: selectedRole });
      Alert.alert('Role Updated', `User role set to ${selectedRole}.`);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update role');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>
          {isStaff ? 'Moderation & Admin Console' : 'Safety & Suspension Appeals'}
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
                loadData();
              }}
              tintColor={colors.primary}
            />
          }
        >
          {/* Account Standing Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: user?.isSuspended ? colors.error : colors.border,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                @{user?.username} Standing
              </Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(160,32,240,0.18)' }]}>
                <Text style={{ color: colors.primaryLight, fontSize: 11, fontWeight: '800' }}>
                  {(user?.role || 'user').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: user?.isSuspended ? colors.error : '#10B981',
                fontWeight: '700',
                fontSize: 13,
                marginTop: 6,
              }}
            >
              {user?.isSuspended
                ? `Account Suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ''}`
                : 'Account in Good Standing'}
            </Text>

            {user?.isSuspended && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  Submit an appeal for moderator review:
                </Text>
                <TextInput
                  placeholder="Reason for appeal..."
                  placeholderTextColor={colors.textMuted}
                  value={appealReason}
                  onChangeText={setAppealReason}
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                />
                <TextInput
                  placeholder="Additional details (optional)..."
                  placeholderTextColor={colors.textMuted}
                  value={appealDetails}
                  onChangeText={setAppealDetails}
                  multiline
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      height: 70,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
                <TouchableOpacity
                  disabled={submittingAppeal}
                  onPress={handleSubmitAppeal}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                    {submittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isStaff && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>
                Your Appeal History ({appeals.length})
              </Text>
              {appeals.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  No appeals filed on this account.
                </Text>
              ) : (
                appeals.map((a) => (
                  <View key={a.id} style={[styles.itemBox, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      Status: {a.status.toUpperCase()}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }}>
                      {a.reason}
                    </Text>
                    {a.reviewerNotes && (
                      <Text style={{ color: colors.primaryLight, fontSize: 12, marginTop: 4 }}>
                        Reviewer note: {a.reviewerNotes}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Staff Console */}
          {isStaff && (
            <>
              <View style={styles.tabRow}>
                {(['reports', 'appeals', 'logs', 'users'] as StaffTab[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.tabChip,
                      {
                        backgroundColor:
                          activeTab === tab ? colors.primary : colors.surfaceElevated,
                        borderColor: activeTab === tab ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: activeTab === tab ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      {tab.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {activeTab === 'reports' && (
                <>
                  <View style={styles.tabRow}>
                    {['pending', 'resolved', 'dismissed', 'all'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setStatusFilter(st)}
                        style={[
                          styles.filterPill,
                          {
                            borderColor: statusFilter === st ? colors.primaryLight : colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: statusFilter === st ? colors.primaryLight : colors.textSecondary,
                            fontSize: 11.5,
                            fontWeight: '700',
                          }}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {reports.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                      No reports match this filter.
                    </Text>
                  ) : (
                    reports.map((report) => (
                      <View
                        key={report.id}
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                            marginBottom: spacing.sm,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13.5 }}>
                          {report.targetType.toUpperCase()} • {report.reason.toUpperCase()}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                          Target ID: {report.targetId} • Status: {report.status}
                        </Text>
                        {report.description ? (
                          <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 6 }}>
                            {report.description}
                          </Text>
                        ) : null}
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            onPress={() => handleResolveReport(report.id, 'resolved', true)}
                            style={[styles.miniBtn, { backgroundColor: colors.error }]}
                          >
                            <Text style={styles.miniBtnText}>Remove Content</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleResolveReport(report.id, 'resolved', false)}
                            style={[styles.miniBtn, { backgroundColor: colors.primary }]}
                          >
                            <Text style={styles.miniBtnText}>Resolve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleResolveReport(report.id, 'dismissed', false)}
                            style={[styles.miniBtn, { backgroundColor: colors.surface }]}
                          >
                            <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' }}>
                              Dismiss
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}

              {activeTab === 'appeals' && (
                <>
                  {appeals.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                      No suspension appeals found.
                    </Text>
                  ) : (
                    appeals.map((appeal) => (
                      <View
                        key={appeal.id}
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.border,
                            marginBottom: spacing.sm,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13.5 }}>
                          @{appeal.username} • {appeal.status.toUpperCase()}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 4 }}>
                          {appeal.reason}
                        </Text>
                        {appeal.status === 'pending' && (
                          <View style={styles.actionsRow}>
                            <TouchableOpacity
                              onPress={() => handleReviewAppeal(appeal.id, 'approved')}
                              style={[styles.miniBtn, { backgroundColor: '#10B981' }]}
                            >
                              <Text style={styles.miniBtnText}>Approve & Restore</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleReviewAppeal(appeal.id, 'rejected')}
                              style={[styles.miniBtn, { backgroundColor: colors.error }]}
                            >
                              <Text style={styles.miniBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}

              {activeTab === 'logs' && (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  {logs.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      No moderation actions logged yet.
                    </Text>
                  ) : (
                    logs.map((log, i) => (
                      <View
                        key={log.id}
                        style={[
                          styles.itemBox,
                          i === 0 && { borderTopWidth: 0, paddingTop: 0 },
                          { borderTopColor: colors.border },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          @{log.actorUsername}: {log.action} ({log.targetType})
                        </Text>
                        {log.reason && (
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {log.reason}
                          </Text>
                        )}
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'users' && (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>
                    Account Enforcement Controls
                  </Text>
                  <TextInput
                    placeholder="Target User ID..."
                    placeholderTextColor={colors.textMuted}
                    value={targetUserId}
                    onChangeText={setTargetUserId}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  />
                  <TextInput
                    placeholder="Reason for suspension / restoration..."
                    placeholderTextColor={colors.textMuted}
                    value={suspendReason}
                    onChangeText={setSuspendReason}
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  />
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => handleToggleSuspend(true)}
                      style={[styles.miniBtn, { backgroundColor: colors.error }]}
                    >
                      <Text style={styles.miniBtnText}>Suspend & Revoke Sessions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleToggleSuspend(false)}
                      style={[styles.miniBtn, { backgroundColor: '#10B981' }]}
                    >
                      <Text style={styles.miniBtnText}>Unsuspend</Text>
                    </TouchableOpacity>
                  </View>

                  {isAdmin && (
                    <View style={{ marginTop: spacing.lg }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                        ADMIN ROLE ASSIGNMENT
                      </Text>
                      <View style={styles.tabRow}>
                        {(['user', 'moderator', 'admin'] as AccountRole[]).map((role) => (
                          <TouchableOpacity
                            key={role}
                            onPress={() => setSelectedRole(role)}
                            style={[
                              styles.filterPill,
                              {
                                backgroundColor:
                                  selectedRole === role ? colors.primary : colors.surface,
                                borderColor:
                                  selectedRole === role ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: selectedRole === role ? '#FFFFFF' : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              {role}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        onPress={handleSetRole}
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Apply Role</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
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
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  miniBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
  },
  miniBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  itemBox: {
    borderTopWidth: 0.5,
    paddingTop: 10,
    marginTop: 10,
  },
});

