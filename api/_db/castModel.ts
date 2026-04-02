import type { Model } from 'mongoose';

/**
 * Mongoose model exports are inferred as unions in strict builds (Vercel tsc),
 * which breaks findOne/findById overload resolution. Cast to a single Model.
 */
export function castModel(m: unknown): Model<any> {
  return m as Model<any>;
}
