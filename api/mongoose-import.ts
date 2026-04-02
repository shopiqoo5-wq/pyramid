import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // We only check that `mongoose` can be imported in Vercel runtime.
  return res.status(200).json({
    ok: true,
    readyState: mongoose.connection.readyState,
  });
}

