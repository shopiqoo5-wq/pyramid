import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../_db/postgres.js';
import { keysToCamel } from '../../_db/sqlUtils.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { userId } = requireAuth(req);

    const { ticketId, message, imageUrl, isStaff } = req.body || {};
    if (!ticketId || !message) return res.status(400).json({ message: 'ticketId and message are required' });

    const newMessage = {
      senderId: userId,
      message,
      imageUrl,
      isStaff: !!isStaff,
      createdAt: new Date().toISOString(),
    };

    const result = await query(
      `UPDATE tickets 
       SET messages = messages || $1::jsonb, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify([newMessage]), ticketId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });

    return res.status(200).json(keysToCamel(result.rows[0]));
  } catch (e: any) {
    console.error('[tickets/message] error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to add message' });
  }
}
