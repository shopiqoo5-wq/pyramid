import '../_utils/suppressDep0169.js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Set up WebSocket for drivers that need it (standard for @neondatabase/serverless)
if (!process.env.VERCEL) {
  // Only needed for local development if not using the HTTP fetch fallback
  neonConfig.webSocketConstructor = ws;
}

let cachedPool: Pool | null = null;

export default function getPool() {
  if (cachedPool) return cachedPool;

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set in environment variables.');
  }

  cachedPool = new Pool({
    connectionString,
  });

  return cachedPool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}
