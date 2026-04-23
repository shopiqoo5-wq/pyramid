import '../_utils/suppressDep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../_db/postgres.js';
import { keysToCamel } from '../_db/sqlUtils.js';
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

    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Convert keys to camelCase for consistency with frontend
    const camelUser = keysToCamel(user);

    // For demo/migration, handle plain text or hashed
    const isMatch = await bcrypt.compare(password, user.password_hash || '').catch(() => password === user.password || password === user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: camelUser.id, role: camelUser.role, companyId: camelUser.companyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, password_hash: __, ...userWithoutPassword } = camelUser;
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    console.error('[auth/login] error:', error);
    res.status(500).json({ message: error.message });
  }
}
