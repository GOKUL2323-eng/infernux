import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain alphanumeric characters, dots, and underscores'),
  email: z.string().optional(),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters'),
  displayName: z
    .string()
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  phoneNumber: z.string().optional(),
});

export const loginSchema = z.object({
  loginIdentifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export const sendPhoneOtpSchema = z.object({
  phoneNumber: z.string().min(5, 'Phone number must be at least 5 digits').max(20, 'Phone number too long'),
  countryCode: z.string().optional().default('+91'),
  purpose: z.enum(['login', 'register', 'change_phone']).default('login'),
});

export const verifyPhoneOtpSchema = z.object({
  phoneNumber: z.string().min(5, 'Phone number must be at least 5 digits').max(20, 'Phone number too long'),
  countryCode: z.string().optional().default('+91'),
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d{6}$/, 'Verification code must be numeric'),
  purpose: z.enum(['login', 'register', 'change_phone']).default('login'),
});

export const phoneRegisterSchema = z.object({
  phoneNumber: z.string().min(5).max(20),
  countryCode: z.string().optional().default('+91'),
  otp: z.string().length(6).regex(/^\d{6}$/),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain alphanumeric characters, dots, and underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  acceptedTerms: z.boolean().refine((val) => val === true, 'You must accept the terms of service and privacy policy'),
});

export const changePhoneSchema = z.object({
  newPhoneNumber: z.string().min(5).max(20),
  countryCode: z.string().optional().default('+91'),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema>;
export type VerifyPhoneOtpInput = z.infer<typeof verifyPhoneOtpSchema>;
export type PhoneRegisterInput = z.infer<typeof phoneRegisterSchema>;
export type ChangePhoneInput = z.infer<typeof changePhoneSchema>;
