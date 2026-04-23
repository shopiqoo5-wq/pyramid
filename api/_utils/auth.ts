import '../_utils/suppressDep0169.js';
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
    console.error('[auth] CRITICAL: JWT_SECRET environment variable is missing.');
    const err = new Error('JWT_SECRET is missing in server environment');
    (err as any).status = 500;
    throw err;
  }
  return secret;
};

export function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  const raw = Array.isArray(header) ? header[0] : (header as string);
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export function requireAuth(req: VercelRequest): JwtPayload {
  const token = getBearerToken(req);
  
  if (!token) {
    console.warn('[auth] No token provided');
    const err = new Error('Unauthorized: No session token found');
    (err as any).status = 401;
    throw err;
  }

  try {
    const secret = getSecret();
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload.userId) throw new Error('Missing userId in token');
    return payload;
  } catch (err: any) {
    console.warn(`[auth] Rejection: ${err.message}`);
    const enriched = new Error('Unauthorized: Invalid or expired token');
    (enriched as any).status = 401;
    throw enriched;
  }
}
