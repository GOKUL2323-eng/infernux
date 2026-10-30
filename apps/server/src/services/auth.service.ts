import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { User, IUserDocument } from '../models/User';
import { Session } from '../models/Session';
import { hashToken } from '../utils/crypto';
import {
  RegisterInput,
  LoginInput,
  AuthTokens,
  AuthResponse,
  UserProfile,
  ChangePasswordInput,
} from '@infernux/shared';

export class AuthService {
  private generateTokens(user: IUserDocument): AuthTokens {
    const payload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: '15m',
    });

    const refreshToken = `${uuidv4()}.${jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: '30d',
    })}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 mins in seconds
    };
  }

  async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const username = input.username.toLowerCase().trim();
    const email = (input.email || `${username}@mozhi.app`).toLowerCase().trim();
    const displayName = (input.displayName || input.username).trim();

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('Username is already taken');
      }
      throw new Error('An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = new User({
      username,
      email,
      passwordHash,
      displayName,
      phoneNumber: input.phoneNumber,
    });

    await user.save();

    const tokens = this.generateTokens(user);
    const refreshTokenHash = hashToken(tokens.refreshToken);

    const session = new Session({
      userId: user._id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await session.save();

    return {
      user: user.toProfileJSON(),
      tokens,
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const rawIdentifier = input.loginIdentifier.trim();
    const identifier = rawIdentifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phoneNumber: rawIdentifier },
      ],
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const tokens = this.generateTokens(user);
    const refreshTokenHash = hashToken(tokens.refreshToken);

    const session = new Session({
      userId: user._id,
      refreshTokenHash,
      deviceId: input.deviceId,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await session.save();

    return {
      user: user.toProfileJSON(),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const refreshTokenHash = hashToken(refreshToken);
    const session = await Session.findOne({
      refreshTokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findById(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Rotate refresh token: revoke current session and issue new one
    session.isRevoked = true;
    await session.save();

    const newTokens = this.generateTokens(user);
    const newRefreshTokenHash = hashToken(newTokens.refreshToken);

    const newSession = new Session({
      userId: user._id,
      refreshTokenHash: newRefreshTokenHash,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await newSession.save();

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = hashToken(refreshToken);
    await Session.updateOne({ refreshTokenHash }, { $set: { isRevoked: true } });
  }

  async deleteAccount(userId: string): Promise<void> {
    await Session.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(input.newPassword, salt);
    await user.save();
    await Session.updateMany({ userId }, { $set: { isRevoked: true } });
  }
}

export const authService = new AuthService();

