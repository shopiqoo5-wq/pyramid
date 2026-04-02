import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../src/lib/mongodb.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await connectToDatabase();
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(503).json({ ok: false, message: e?.message || 'DB unavailable' });
  }
}

