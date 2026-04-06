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
    const err = new Error('JWT_SECRET is missing in server environment');
    (err as any).status = 500;
    throw err;
  }
  return secret;
};

export function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export function requireAuth(req: VercelRequest): JwtPayload {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Unauthorized: Verification token required');
    (err as any).status = 401;
    throw err;
  }

  try {
    const payload = jwt.verify(token, getSecret()) as JwtPayload;
    if (!payload?.userId) throw new Error('Malformed session token payload');
    return payload;
  } catch (err: any) {
    const isSecretMissing = err.message?.includes('missing in server environment');
    const enriched = new Error(err.message || 'Unauthorized');
    (enriched as any).status = isSecretMissing ? 500 : 401;
    throw enriched;
  }
}

