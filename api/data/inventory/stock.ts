import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../../_db/mongodb.js';
import { castModel } from '../../_db/castModel.js';
import { Inventory } from '../../_db/Schemas.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    requireAuth(req);
    await connectToDatabase();

    const { productId, warehouseId, quantity } = req.body || {};
    if (!productId || !warehouseId) return res.status(400).json({ message: 'productId and warehouseId are required' });

    const q = Number(quantity);
    if (!Number.isFinite(q)) return res.status(400).json({ message: 'quantity must be a number' });

    const updated = await castModel(Inventory).findOneAndUpdate(
      { productId, warehouseId },
      { $set: { quantity: q, availableQuantity: q } },
      { new: true, upsert: true }
    );

    return res.status(200).json(updated);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to update stock' });
  }
}

