import mongoose from 'mongoose';

// In serverless, some driver failures can surface as unhandled rejections / uncaught exceptions
// (which would make Vercel return `FUNCTION_INVOCATION_FAILED` before our try/catch runs).
// These handlers keep the process alive so our API route can return a proper JSON error.
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

// Prevent Node from crashing the serverless function on Mongo connection errors.
// Mongoose will emit `connection` -> `error` events; without listeners this can become
// an unhandled exception that Vercel reports as FUNCTION_INVOCATION_FAILED.
try {
  if (mongoose.connection && mongoose.connection.listenerCount('error') === 0) {
    mongoose.connection.on('error', (err) => {
      console.error('[mongo] connection error:', err?.message || err);
    });
  }
} catch {
  // If listenerCount/on are unavailable for some reason, we just continue.
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (globalThis as any).mongoose;

if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null };
}

async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Backend persistence requires a real database connection.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  try {
    const opts = {
      bufferCommands: false,
      // Fail fast in serverless.
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      maxPoolSize: 1,
    } as any;

    cached.conn = await mongoose.connect(MONGODB_URI, opts);
  } catch (e) {
    cached.conn = null;
    // Ensure we don't leave a half-open connection around.
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
