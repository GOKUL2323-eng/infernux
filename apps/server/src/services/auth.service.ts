import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/env';
import { User, IUserDocument } from '../models/User';
import { Session } from '../models/Session';
import { hashToken } from '../utils/crypto';
import { smsService } from './sms.service';
import {
  RegisterInput,
  LoginInput,
  AuthTokens,
  AuthResponse,
  UserProfile,
  ChangePasswordInput,
  SendPhoneOtpInput,
  VerifyPhoneOtpInput,
  PhoneRegisterInput,
  ChangePhoneInput,
  SendPhoneOtpResponse,
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

  async sendPhoneOtp(input: SendPhoneOtpInput): Promise<SendPhoneOtpResponse> {
    const { e164 } = smsService.normalizePhoneNumber(input.phoneNumber, input.countryCode);

    const existingUser = await User.findOne({
      $or: [{ normalizedPhoneNumber: e164 }, { phoneNumber: e164 }],
    });

    if (input.purpose === 'register' && existingUser && existingUser.phoneVerified) {
      throw new Error('This phone number is already registered to another account. Please sign in instead.');
    }

    const result = await smsService.sendOtp(input.phoneNumber, input.countryCode, input.purpose);
    return {
      ...result,
      isRegistered: !!existingUser,
    };
  }

  async loginWithPhone(
    input: VerifyPhoneOtpInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse & { isNewUser?: boolean }> {
    const { normalizedPhoneNumber } = await smsService.verifyOtp(
      input.phoneNumber,
      input.countryCode,
      input.otp,
      'login'
    );

    let user = await User.findOne({
      $or: [{ normalizedPhoneNumber }, { phoneNumber: normalizedPhoneNumber }],
    });

    let isNewUser = false;

    // If user does not exist with this phone number, auto-provision account
    if (!user) {
      isNewUser = true;
      const cleanDigits = normalizedPhoneNumber.replace(/\D/g, '');
      const uniqueSuffix = cleanDigits.slice(-6);
      const generatedUsername = `user_${uniqueSuffix}`;
      const tempEmail = `${generatedUsername}@mozhi.app`;
      const tempPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);

      user = new User({
        username: generatedUsername,
        displayName: `User ${uniqueSuffix}`,
        email: tempEmail,
        passwordHash: tempPasswordHash,
        phoneNumber: input.phoneNumber,
        countryCode: input.countryCode || '+91',
        normalizedPhoneNumber,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        authenticationProvider: 'phone',
      });
      await user.save();
    } else {
      if (!user.phoneVerified) {
        user.phoneVerified = true;
        user.phoneVerifiedAt = new Date();
        user.normalizedPhoneNumber = normalizedPhoneNumber;
        await user.save();
      }
    }

    const tokens = this.generateTokens(user);
    const refreshTokenHash = hashToken(tokens.refreshToken);

    const session = new Session({
      userId: user._id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await session.save();

    return {
      user: user.toProfileJSON(),
      tokens,
      isNewUser,
    };
  }

  async registerWithPhone(
    input: PhoneRegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const { normalizedPhoneNumber } = await smsService.verifyOtp(
      input.phoneNumber,
      input.countryCode,
      input.otp,
      'register'
    );

    const username = input.username.toLowerCase().trim();
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      throw new Error('Username is already taken');
    }

    const existingPhone = await User.findOne({
      $or: [{ normalizedPhoneNumber }, { phoneNumber: normalizedPhoneNumber }],
    });
    if (existingPhone && existingPhone.phoneVerified) {
      throw new Error('This phone number is already registered to another account. Please sign in instead.');
    }

    const tempEmail = `${username}@mozhi.app`;
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password || crypto.randomBytes(16).toString('hex'), salt);

    const user = new User({
      username,
      displayName: input.displayName.trim() || username,
      email: tempEmail,
      passwordHash,
      phoneNumber: input.phoneNumber,
      countryCode: input.countryCode || '+91',
      normalizedPhoneNumber,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      authenticationProvider: 'phone',
    });
    await user.save();

    const tokens = this.generateTokens(user);
    const refreshTokenHash = hashToken(tokens.refreshToken);

    const session = new Session({
      userId: user._id,
      refreshTokenHash,
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

  async changePhoneNumber(userId: string, input: ChangePhoneInput): Promise<UserProfile> {
    const { normalizedPhoneNumber } = await smsService.verifyOtp(
      input.newPhoneNumber,
      input.countryCode,
      input.otp,
      'change_phone'
    );

    const existingPhone = await User.findOne({
      _id: { $ne: userId },
      $or: [{ normalizedPhoneNumber }, { phoneNumber: normalizedPhoneNumber }],
    });

    if (existingPhone && existingPhone.phoneVerified) {
      throw new Error('This phone number is already registered to another user.');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.phoneNumber = input.newPhoneNumber;
    user.countryCode = input.countryCode || '+91';
    user.normalizedPhoneNumber = normalizedPhoneNumber;
    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    await user.save();

    return user.toProfileJSON();
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

