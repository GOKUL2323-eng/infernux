import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { OtpVerification } from '../models/OtpVerification';
import { logger } from '../utils/logger';

export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private verifyServiceSid: string | null = null;
  private twilioPhoneNumber: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || null;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken && !accountSid.startsWith('your_') && accountSid.length > 10) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        logger.info('Twilio SMS Client initialized successfully', 'SmsService');
      } catch (err: any) {
        logger.warn(`Failed to initialize Twilio client: ${err.message}`, 'SmsService');
      }
    } else {
      logger.info(
        'Twilio credentials not configured in apps/server/.env. Running in development mode with local verification.',
        'SmsService'
      );
    }
  }

  /**
   * Normalize and validate phone number to standard E.164 format.
   * e.g., ("9876543210", "+91") -> "+919876543210"
   */
  normalizePhoneNumber(rawPhone: string, countryCode: string = '+91'): {
    e164: string;
    formatted: string;
    country: string;
  } {
    const cleaned = rawPhone.trim();
    const cleanCountry = countryCode.trim().replace('+', '');

    // Map common country calling codes to ISO 3166-1 alpha-2 codes
    const callingCodeToIso: Record<string, CountryCode> = {
      '91': 'IN',
      '1': 'US',
      '44': 'GB',
      '971': 'AE',
      '65': 'SG',
      '61': 'AU',
      '49': 'DE',
      '33': 'FR',
      '81': 'JP',
      '86': 'CN',
      '966': 'SA',
      '60': 'MY',
      '62': 'ID',
    };

    const defaultIso = callingCodeToIso[cleanCountry] || 'IN';

    // If starts with +, parse directly, else parse with default country
    let parsed = cleaned.startsWith('+')
      ? parsePhoneNumberFromString(cleaned)
      : parsePhoneNumberFromString(cleaned, defaultIso);

    // If still not parsed, prepend country code
    if (!parsed || !parsed.isValid()) {
      const prefixed = countryCode.startsWith('+') ? `${countryCode}${cleaned}` : `+${cleanCountry}${cleaned}`;
      parsed = parsePhoneNumberFromString(prefixed);
    }

    if (!parsed || !parsed.isValid()) {
      throw new Error(`Invalid phone number for country (${countryCode}). Please check and try again.`);
    }

    return {
      e164: parsed.number,
      formatted: parsed.formatInternational(),
      country: parsed.country || defaultIso,
    };
  }

  /**
   * Mask phone number for secure UI display.
   * e.g. "+919876543210" -> "+91 98*** ***10"
   */
  maskPhoneNumber(e164: string): string {
    if (e164.length < 8) return '****' + e164.slice(-4);
    const countryPart = e164.slice(0, 3);
    const firstTwo = e164.slice(3, 5);
    const lastTwo = e164.slice(-2);
    return `${countryPart} ${firstTwo}*** ***${lastTwo}`;
  }

  /**
   * Send a real SMS OTP code.
   */
  async sendOtp(
    rawPhoneNumber: string,
    countryCode: string = '+91',
    purpose: 'login' | 'register' | 'change_phone' = 'login'
  ): Promise<{
    success: boolean;
    message: string;
    maskedPhoneNumber: string;
    cooldownSeconds: number;
    expiresInSeconds: number;
  }> {
    const { e164 } = this.normalizePhoneNumber(rawPhoneNumber, countryCode);

    // 1. Rate limiting: Check recent OTP requests in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await OtpVerification.countDocuments({
      phoneNumber: e164,
      createdAt: { $gte: tenMinutesAgo },
    });

    if (recentCount >= 5) {
      throw new Error('Too many OTP requests. For security, please wait 10 minutes before requesting again.');
    }

    // 2. Cooldown check: Must wait 30 seconds between requests
    const lastOtp = await OtpVerification.findOne({
      phoneNumber: e164,
      purpose,
    }).sort({ createdAt: -1 });

    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < 30 * 1000) {
      const waitTime = Math.ceil((30 * 1000 - (Date.now() - lastOtp.createdAt.getTime())) / 1000);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new code.`);
    }

    // 3. Generate cryptographic 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 4. Save verification record in database
    await OtpVerification.create({
      phoneNumber: e164,
      countryCode,
      purpose,
      otpHash,
      attempts: 0,
      verified: false,
      expiresAt,
    });

    const masked = this.maskPhoneNumber(e164);

    // 5. Dispatch real SMS via Twilio if configured
    let smsSent = false;
    if (this.twilioClient) {
      try {
        if (this.verifyServiceSid) {
          // Use Twilio Verify API
          await this.twilioClient.verify.v2.services(this.verifyServiceSid).verifications.create({
            to: e164,
            channel: 'sms',
          });
          smsSent = true;
          logger.info(`Twilio Verify OTP dispatched to ${masked}`, 'SmsService');
        } else if (this.twilioPhoneNumber) {
          // Use Twilio Messages API
          await this.twilioClient.messages.create({
            to: e164,
            from: this.twilioPhoneNumber,
            body: `Your MOZHI verification code is ${otpCode}. It expires in 10 minutes. Never share this code.`,
          });
          smsSent = true;
          logger.info(`Twilio SMS dispatched to ${masked}`, 'SmsService');
        }
      } catch (err: any) {
        logger.error(`Twilio SMS dispatch failed for ${masked}: ${err.message}`, 'SmsService');
        // Do not crash, fall through to local verified OTP
      }
    }

    if (!smsSent) {
      logger.info(
        `[SMS DEV LOG] Real SMS provider simulated for ${masked}. Verification code: ${otpCode} (Valid for 10 min)`,
        'SmsService'
      );
    }

    return {
      success: true,
      message: `Verification code sent to ${masked}`,
      maskedPhoneNumber: masked,
      cooldownSeconds: 30,
      expiresInSeconds: 600,
    };
  }

  /**
   * Verify an OTP code against Twilio or the database hash.
   */
  async verifyOtp(
    rawPhoneNumber: string,
    countryCode: string = '+91',
    otp: string,
    purpose: 'login' | 'register' | 'change_phone' = 'login'
  ): Promise<{ success: boolean; normalizedPhoneNumber: string }> {
    const { e164 } = this.normalizePhoneNumber(rawPhoneNumber, countryCode);

    // Find latest active verification record
    const record = await OtpVerification.findOne({
      phoneNumber: e164,
      purpose,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      throw new Error('Verification code has expired or was not requested. Please request a new code.');
    }

    if (record.attempts >= 5) {
      throw new Error('Too many incorrect verification attempts. Please request a new code.');
    }

    let isMatch = false;

    // Check with Twilio Verify if service configured
    if (this.twilioClient && this.verifyServiceSid) {
      try {
        const check = await this.twilioClient.verify.v2
          .services(this.verifyServiceSid)
          .verificationChecks.create({ to: e164, code: otp });
        isMatch = check.status === 'approved';
      } catch (err: any) {
        logger.warn(`Twilio verification check error: ${err.message}`, 'SmsService');
      }
    }

    // Fallback: verify bcrypt hash in database
    if (!isMatch) {
      isMatch = await bcrypt.compare(otp, record.otpHash);
    }

    // Also support universal developer test code in non-production environments
    if (!isMatch && process.env.NODE_ENV !== 'production' && otp === '999999') {
      isMatch = true;
    }

    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      throw new Error(`Incorrect verification code. ${remaining} attempts remaining.`);
    }

    // Mark verified
    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();

    return { success: true, normalizedPhoneNumber: e164 };
  }
}

export const smsService = new SmsService();

