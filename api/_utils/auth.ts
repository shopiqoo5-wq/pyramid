import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
  role?: string;
  companyId?: string;
};

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[auth] CRITICAL: JWT_SECRET is missing!');
    const err = new Error('JWT_SECRET is missing in server environment');
    (err as any).status = 500;
    throw err;
  }
  return secret;
};

export function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  const raw = Array.isArray(header) ? header[0] : (header as string);
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export function requireAuth(req: VercelRequest): JwtPayload {
  const token = getBearerToken(req);
  if (!token) {
    console.warn('[auth] No token provided in headers');
    const err = new Error('Unauthorized: No session token provided');
    (err as any).status = 401;
    throw err;
  }

  try {
    const secret = getSecret();
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload?.userId) {
      console.error('[auth] Token missing userId payload');
      throw new Error('Malformed session token: missing userId');
    }
    return payload;
  } catch (err: any) {
    const isSecretMissing = err.message?.includes('missing in server environment');
    if (!isSecretMissing) {
      console.warn(`[auth] Token verification failed: ${err.message}`);
    }
    const msg = isSecretMissing ? err.message : `Unauthorized: ${err.message || 'Invalid token'}`;
    const enriched = new Error(msg);
    (enriched as any).status = isSecretMissing ? 500 : 401;
    throw enriched;
  }
}
