// Minimal HS256 JWT — sign/verify via Node's built-in crypto. No jsonwebtoken dependency.
//
// We keep this deliberately small: a standard JWS Compact (header.payload.signature),
// HMAC-SHA256, base64url everywhere, timing-safe signature comparison, and an exp check.
// `now` is injected by callers so this is pure and unit-testable.

import { createHmac, timingSafeEqual } from 'crypto';

export interface JwtPayload {
  sub: string;    // AdminUser.id
  email: string;
  role: string;   // AdminRole
  iat: number;    // issued-at (seconds)
  exp: number;    // expiry (seconds)
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

/**
 * Sign a token. `nowSec` is the current time in seconds; `ttlSeconds` the lifetime.
 */
export function signJwt(
  claims: Pick<JwtPayload, 'sub' | 'email' | 'role'>,
  secret: string,
  ttlSeconds: number,
  nowSec: number,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JwtPayload = { ...claims, iat: nowSec, exp: nowSec + ttlSeconds };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify a token's signature and expiry. Returns the payload, or null if invalid/expired.
 */
export function verifyJwt(token: string, secret: string, nowSec: number): JwtPayload | null {
  try {
    const parts = (token ?? '').split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sig] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = createHmac('sha256', secret).update(data).digest('base64url');

    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < nowSec) return null;
    return payload;
  } catch {
    return null;
  }
}
