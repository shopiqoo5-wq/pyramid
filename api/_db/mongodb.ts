import '../_utils/suppressDep0169.js';
import mongoose from 'mongoose';

// Keep serverless functions from crashing on driver-level errors.
try {
  if (process.listenerCount('unhandledRejection') === 0) {
    process.on('unhandledRejection', (reason) => {
      console.error('[mongo] unhandledRejection:', reason);
    });
  }
  if (process.listenerCount('uncaughtException') === 0) {
    process.on('uncaughtException', (err) => {
      console.error('[mongo] uncaughtException:', (err as any)?.message || err);
    });
  }
} catch {
  // ignore
}

try {
  if (mongoose.connection && mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('error', (err) => {
      console.error('[mongo] connection error:', err?.message || err);
    });
  }
} catch {
  // ignore
}

let cached = (globalThis as any).mongoose;
if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null };
}

export default async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Backend persistence requires a real database connection.');
  }

  if (cached.conn) return cached.conn;

  try {
    cached.conn = await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      maxPoolSize: 1,
      autoIndex: false,
    } as any);
  } catch (e) {
    cached.conn = null;
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    throw e;
  }

  return cached.conn;
}

