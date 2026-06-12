// Password hashing — scrypt via Node's built-in crypto. No native deps, no install step.
//
// Stored format:  "scrypt$<saltHex>$<hashHex>"
// scrypt is memory-hard and a sound choice for password storage. We use a random salt
// per password and a timing-safe comparison on verify. We never store, log, or return plaintext.

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LEN = 64;   // Derived key length in bytes.
const SALT_LEN = 16;  // Per-password salt length in bytes.

/**
 * Hash a plaintext password for storage.
 * @returns "scrypt$<saltHex>$<hashHex>"
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(plain, salt, KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash. Constant-time on the digest compare.
 * Returns false (never throws) on any malformed input.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = (stored ?? '').split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = scryptSync(plain, salt, expected.length);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}
