import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../_db/postgres.js';
import { keysToCamel } from '../../_db/sqlUtils.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    requireAuth(req);

    const { productId, warehouseId, quantity } = req.body || {};
    if (!productId || !warehouseId) return res.status(400).json({ message: 'productId and warehouseId are required' });

    const q = Number(quantity);
    if (!Number.isFinite(q)) return res.status(400).json({ message: 'quantity must be a number' });

    const result = await query(
      `INSERT INTO inventory (product_id, warehouse_id, quantity, available_quantity, updated_at)
       VALUES ($1, $2, $3, $3, NOW())
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, available_quantity = EXCLUDED.available_quantity, updated_at = NOW()
       RETURNING *`,
      [productId, warehouseId, q]
    );

    return res.status(200).json(keysToCamel(result.rows[0]));
  } catch (e: any) {
    console.error('[inventory/stock] error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to update stock' });
  }
}
