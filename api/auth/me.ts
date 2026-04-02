import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../../src/lib/mongodb.js';
import { User } from '../../src/models/Schemas.js';
import { requireAuth } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    await connectToDatabase();
    const { userId } = requireAuth(req);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password: _pw, ...userWithoutPassword } = user.toObject();
    return res.status(200).json(userWithoutPassword);
  } catch (e: any) {
    return res.status(401).json({ message: e?.message || 'Unauthorized' });
  }
}

