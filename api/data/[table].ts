import '../_utils/suppressDep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db/postgres.js';
import { SQL, keysToCamel } from '../_db/sqlUtils.js';
import { requireAuth } from '../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { table } = req.query;
  const tableName = String(table);

  // Mapping some table names if they differ from the URL param
  const tableMap: Record<string, string> = {
    'time_off_requests': 'time_off_requests',
    'attendance_records': 'attendance_records',
    'field_incidents': 'field_incidents',
    'work_reports': 'work_reports',
  };

  const sqlTable = tableMap[tableName] || tableName;

  try {
    // All data routes require auth
    requireAuth(req);

    if (req.method === 'GET') {
      const q = req.query as Record<string, string | string[] | undefined>;
      const { id, table: _routeTable, ...filters } = q;

      if (id) {
        const result = await query(`SELECT * FROM ${sqlTable} WHERE id = $1`, [id]);
        if (result.rows.length === 0) return res.status(200).json(null);
        return res.status(200).json(keysToCamel(result.rows[0]));
      }

      // Prepare filters
      const cleanFilters: Record<string, any> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (typeof v === 'undefined') continue;
        cleanFilters[k] = Array.isArray(v) ? v[0] : v;
      }

      const { text, params } = SQL.select(sqlTable, cleanFilters);
      const result = await query(text, params);
      return res.status(200).json(keysToCamel(result.rows));
    }

    if (req.method === 'POST') {
      const { text, params } = SQL.insert(sqlTable, req.body);
      const result = await query(text, params);
      return res.status(201).json(keysToCamel(result.rows[0]));
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'Missing ID for update' });
      
      const { text, params } = SQL.update(sqlTable, String(id), req.body);
      const result = await query(text, params);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      return res.status(200).json(keysToCamel(result.rows[0]));
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'Missing ID for delete' });

      const { text, params } = SQL.delete(sqlTable, String(id));
      await query(text, params);
      return res.status(204).end();
    }

    res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error: any) {
    console.error(`[data/${tableName}] error:`, error);
    const msg = error?.message || String(error);
    const lower = msg.toLowerCase();
    const isAuth =
      lower.includes('token') ||
      lower.includes('jwt') ||
      lower.includes('unauthorized') ||
      lower.includes('authorization');
    const status = error.status || (isAuth ? 401 : 500);
    res.status(status).json({ message: msg });
  }
}
