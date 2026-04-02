import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
  role?: string;
  companyId?: string;
};

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
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
  if (!token) throw new Error('Missing Authorization token');
  const payload = jwt.verify(token, getSecret()) as JwtPayload;
  if (!payload?.userId) throw new Error('Invalid token payload');
  return payload;
}

