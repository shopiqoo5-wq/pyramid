import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../../../src/lib/mongodb.js';
import { Ticket } from '../../../src/models/Schemas.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { userId } = requireAuth(req);
    await connectToDatabase();

    const { ticketId, message, imageUrl, isStaff } = req.body || {};
    if (!ticketId || !message) return res.status(400).json({ message: 'ticketId and message are required' });

    const updated = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $push: {
          messages: {
            senderId: userId,
            message,
            imageUrl,
            isStaff: !!isStaff,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    return res.status(200).json(updated);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to add message' });
  }
}

