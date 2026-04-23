import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_db/postgres.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await query('SELECT NOW()');
    return res.status(200).json({ ok: true, serverTime: result.rows[0].now });
  } catch (e: any) {
    console.error('[health] error:', e);
    return res.status(503).json({ ok: false, message: e?.message || 'DB unavailable' });
  }
}
