import crypto from 'crypto';

/**
 * Generates a cryptographically secure room invitation key
 * Format: IFNX-XXXX-XXXX-XXXX (uppercase alphanumeric)
 */
export function generateRoomKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused chars (0, O, 1, I)
  const bytes = crypto.randomBytes(12);
  let result = 'IFNX-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-';
    }
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generates a high-entropy random token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 hash for storing sensitive invitation tokens or reset tokens
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validates the format of an Infernux room key
 */
export function isValidRoomKeyFormat(key: string): boolean {
  return /^IFNX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/i.test(key.trim());
}

