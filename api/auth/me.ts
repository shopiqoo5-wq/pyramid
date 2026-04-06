import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../_db/mongodb.js';
import { castModel } from '../_db/castModel.js';
import { User } from '../_db/Schemas.js';
import { getBearerToken, requireAuth } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  // Not logged in: return a neutral response instead of 401 spam.
  if (!getBearerToken(req)) return res.status(200).json(null);

  try {
    await connectToDatabase();
    const { userId } = requireAuth(req);

    const M = castModel(User);
    const user = await M.findById(userId).exec();
    if (!user) return res.status(200).json(null);

    const { password: _pw, ...userWithoutPassword } = user.toObject();
    return res.status(200).json(userWithoutPassword);
  } catch (e: any) {
    const status = e.status || 500;
    const msg = e?.message || 'Unauthorized';
    const lower = String(msg).toLowerCase();
    const isAuthError =
      lower.includes('token') ||
      lower.includes('jwt') ||
      lower.includes('unauthorized') ||
      lower.includes('authorization');
    
    // Config errors (missing secret) should crash with 500 so they are visible.
    // Real auth errors (bad token) should return 200/null to stay silent in background.
    if (status === 500) return res.status(500).json({ message: msg });
    if (isAuthError) return res.status(200).json(null);
    return res.status(status).json({ message: msg });
  }
}

