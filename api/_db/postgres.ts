import '../_utils/suppressDep0169.js';
import pg from 'pg';

const { Pool } = pg;

let cachedPool: pg.Pool | null = null;

export default function getPool() {
  if (cachedPool) return cachedPool;

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not set in environment variables.');
  }

  cachedPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return cachedPool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}
