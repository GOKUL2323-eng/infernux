import { generateRoomKey, generateSecureToken, hashToken, isValidRoomKeyFormat } from '../src/utils/crypto';

describe('Cryptographic & Room Key Utilities', () => {
  it('generates a cryptographically secure room invitation key in valid format', () => {
    const key = generateRoomKey();
    expect(key).toMatch(/^IFNX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect(isValidRoomKeyFormat(key)).toBe(true);
  });

  it('rejects malformed room keys', () => {
    expect(isValidRoomKeyFormat('INVALID-KEY')).toBe(false);
    expect(isValidRoomKeyFormat('IFNX-123-456')).toBe(false);
    expect(isValidRoomKeyFormat('')).toBe(false);
  });

  it('generates unique random tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes hex
  });

  it('computes deterministic SHA-256 token hashes', () => {
    const secret = 'IFNX-ABCD-EFGH-JKLM';
    const hash1 = hashToken(secret);
    const hash2 = hashToken(secret);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
