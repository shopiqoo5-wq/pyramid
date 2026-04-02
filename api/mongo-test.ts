import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    return res.status(400).json({ ok: false, message: 'MONGODB_URI not set' });
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Fail fast in serverless.
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      maxPoolSize: 1,
    } as any);

    // Immediately disconnect so this debug route doesn't keep connections open.
    await conn.disconnect();
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
}

