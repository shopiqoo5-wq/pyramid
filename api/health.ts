import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_db/postgres.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const status: any = {
    db: 'unknown',
    env: {
      POSTGRES_URL: !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
    }
  };

  try {
    const result = await query('SELECT NOW()');
    status.db = 'connected';
    status.serverTime = result.rows[0].now;
    
    // Quick table check
    const tables = await query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
    status.tableCount = parseInt(tables.rows[0].count);

    return res.status(200).json({ ok: true, ...status });
  } catch (e: any) {
    console.error('[health] error:', e);
    status.db = 'error';
    status.error = e?.message || String(e);
    return res.status(503).json({ ok: false, ...status });
  }
}
