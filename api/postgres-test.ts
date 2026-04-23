import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_db/postgres.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const result = await query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1', ['public']);
    return res.status(200).json({ 
      ok: true, 
      tables: result.rows.map(r => r.tablename)
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
