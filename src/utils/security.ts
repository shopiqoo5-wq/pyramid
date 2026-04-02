/**
 * Pyramid FM — Client-Side Security Utilities
 * SEC-04, SEC-05, SEC-06: Cryptographically secure token and password utilities.
 */

/**
 * Generates a cryptographically secure random token using the Web Crypto API.
 * Uses `crypto.getRandomValues()` — NOT `Math.random()`.
 * @param byteLength Number of random bytes (default 24 → 48-char hex string)
 */
export function secureToken(byteLength = 24): string {
  const buffer = new Uint8Array(byteLength);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes a password using SHA-256 via the Web Crypto API.
 * Returns a hex-encoded digest string.
 * NOTE: For production, use bcrypt/argon2 via a server-side function.
 * This implementation provides a meaningful upgrade over storing plain-text
 * in a frontend mock-auth context.
 */
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + 'pf-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous (non-async) password hash for use in initializing mock data.
 * Uses a deterministic encoding trick so mock passwords can be pre-hashed.
 * Only use this for mock/seed data — NOT for user-submitted passwords.
 */
export function mockHash(plainText: string): string {
  // Simple deterministic obfuscation for mock data
  // Real passwords use the async hashPassword() above
  return `mock:${btoa(plainText + ':pf2026')}`;
}

/**
 * Checks a plain-text password against a stored hash.
 * Works for both async SHA-256 hashes and mock hashes.
 */
export async function verifyPassword(plainText: string, stored: string): Promise<boolean> {
  if (stored.startsWith('mock:')) {
    const expected = `mock:${btoa(plainText + ':pf2026')}`;
    return stored === expected;
  }
  const hash = await hashPassword(plainText);
  return hash === stored;
}

/**
 * Strips sensitive fields from user objects before storing in shared state.
 * SEC-11: Prevents password exposure through Zustand DevTools.
 */
export function sanitizeUser<T extends { password?: string; _raw?: unknown }>(user: T): Omit<T, 'password'> {
  const { password: _pw, ...safe } = user;
  return safe as Omit<T, 'password'>;
}

/**
 * Validates that a redirect path is internal (starts with '/') and not a full URL.
 * SEC-13: Prevents open redirect attacks via query string manipulation.
 */
export function safeRedirectPath(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    // If it parses as a full URL it's external — reject it
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search;
  } catch {
    // Not a valid URL at all — treat as a path
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return fallback;
  }
}
