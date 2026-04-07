import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../_db/mongodb.js';
import { castModel } from '../_db/castModel.js';
import { User } from '../_db/Schemas.js';
import { getBearerToken, requireAuth } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  // Not logged in: neutral 200 so callers can probe without throwing.
  if (!getBearerToken(req)) return res.status(200).json(null);

  try {
    const { userId } = requireAuth(req);
    await connectToDatabase();

    const M = castModel(User);
    const user = await M.findById(userId).exec();
    if (!user) {
      return res.status(401).json({ message: 'Session user not found' });
    }

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

    if (status === 500) return res.status(500).json({ message: msg });
    // 401 so the client clears bad tokens and data routes stay consistent.
    if (isAuthError) return res.status(401).json({ message: msg });
    return res.status(status).json({ message: msg });
  }
}

