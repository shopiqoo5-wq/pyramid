/**
 * Mongoose model exports are inferred as unions in strict builds (Vercel tsc),
 * which breaks findOne/findById/findOneAndUpdate overload resolution.
 * Returning `any` avoids TS2353/TS2349 with mongoose@8 + moduleResolution node16.
 */
export function castModel(m: unknown): any {
  return m;
}
