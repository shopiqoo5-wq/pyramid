import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const mongo = process.env.MONGODB_URI || '';
  const jwtSecret = process.env.JWT_SECRET || '';

  return res.status(200).json({
    hasMongo: mongo.length > 0,
    mongoLength: mongo.length,
    hasJwtSecret: jwtSecret.length > 0,
    // Avoid leaking secrets: only show scheme/first chars if present.
    mongoPreview: mongo ? mongo.slice(0, Math.min(20, mongo.length)) : '',
  });
}

