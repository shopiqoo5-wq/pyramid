import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectToDatabase from '../_db/mongodb.js';
import { castModel } from '../_db/castModel.js';
import { User } from '../_db/Schemas.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    if (!JWT_SECRET) {
      console.error('❌ Missing JWT_SECRET env var');
      return res.status(500).json({ message: 'JWT_SECRET is missing in server environment' });
    }
    await connectToDatabase();
    const { email, password } = req.body;

    const M = castModel(User);
    const user = await M.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For demo/migration, handle plain text or hashed
    const isMatch = await bcrypt.compare(password, user.password).catch(() => password === user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userId = String((user as { _id: { toString(): string } })._id);
    const token = jwt.sign(
      { userId, role: user.role, companyId: user.companyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
