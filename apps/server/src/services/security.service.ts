import { ActiveSessionSummary, LoginActivitySummary, SecurityOverviewResponse } from '@infernux/shared';
import { Session } from '../models/Session';
import { LoginActivity } from '../models/LoginActivity';
import { hashToken } from '../utils/crypto';

const SECURITY_DISCLOSURE =
  'Accounts are protected with bcrypt password hashing and short-lived JWT access tokens paired with revocable refresh sessions stored in MongoDB. View-once status and screenshot notifications depend on honest client events and cannot universally block OS hardware capture or external cameras.';

export class SecurityService {
  async getOverview(userId: string): Promise<SecurityOverviewResponse> {
    const [sessions, activities] = await Promise.all([
      Session.find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .limit(30),
      LoginActivity.find({ userId }).sort({ createdAt: -1 }).limit(30),
    ]);

    const mappedSessions: ActiveSessionSummary[] = sessions.map((s) => ({
      id: s._id.toString(),
      deviceId: s.deviceId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      isRevoked: s.isRevoked,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));

    const mappedActivities: LoginActivitySummary[] = activities.map((a) => ({
      id: a._id.toString(),
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      status: a.status,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      sessions: mappedSessions,
      loginActivity: mappedActivities,
      securityDisclosure: SECURITY_DISCLOSURE,
    };
  }

  async revokeSession(userId: string, sessionId: string): Promise<ActiveSessionSummary> {
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new Error('Session not found');
    }

    session.isRevoked = true;
    await session.save();

    return {
      id: session._id.toString(),
      deviceId: session.deviceId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      isRevoked: session.isRevoked,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async revokeOtherSessions(
    userId: string,
    currentRefreshToken?: string
  ): Promise<{ revokedCount: number }> {
    const filter: Record<string, unknown> = {
      userId,
      isRevoked: false,
    };

    if (currentRefreshToken?.trim()) {
      filter.refreshTokenHash = { $ne: hashToken(currentRefreshToken.trim()) };
    }

    const result = await Session.updateMany(filter, { $set: { isRevoked: true } });
    return { revokedCount: result.modifiedCount ?? 0 };
  }
}

export const securityService = new SecurityService();
