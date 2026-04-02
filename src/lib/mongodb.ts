import mongoose from 'mongoose';

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
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Backend persistence requires a real database connection.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Prevent serverless functions from hanging for a long time.
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 2,
    } as any;

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
