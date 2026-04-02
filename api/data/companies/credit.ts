import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../../_db/mongodb.js';
import { castModel } from '../../_db/castModel.js';
import { Company } from '../../_db/Schemas.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    requireAuth(req);
    await connectToDatabase();

    const { id } = req.query;
    const companyId = String(id || '');
    if (!companyId) return res.status(400).json({ message: 'id is required' });

    const { amount } = req.body || {};
    const delta = Number(amount);
    if (!Number.isFinite(delta)) return res.status(400).json({ message: 'amount must be a number' });

    const updated = await castModel(Company).findByIdAndUpdate(
      companyId,
      { $inc: { availableCredit: delta } },
      { new: true }
    );
    return res.status(200).json(updated);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to update credit' });
  }
}

