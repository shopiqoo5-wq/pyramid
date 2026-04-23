/**
 * Mongo / transitive deps still call deprecated url.parse(); Node logs DEP0169 per request.
 * Vercel often does not apply vercel.json NODE_OPTIONS to function workers, so patch here once.
 */
const patchKey = Symbol.for('pyramid.suppressDep0169');

type EmitWarning = typeof process.emitWarning;

function shouldSilence(warning: unknown, args: unknown[]): boolean {
  let code: string | undefined;
  let message = '';

  if (typeof warning === 'string') {
    message = warning;
  } else if (warning && typeof warning === 'object') {
    const o = warning as { code?: string; message?: string };
    code = o.code;
    message = o.message || '';
  }

  for (const a of args) {
    if (typeof a === 'string' && /^DEP\d+$/i.test(a)) code = code || a.toUpperCase();
  }

  if (code === 'DEP0169') return true;
  if (/url\.parse\(\)/i.test(message) || /DEP0169/i.test(message)) return true;
  return false;
}

const proc = process as typeof process & { [patchKey]?: true };

if (!proc[patchKey] && typeof proc.emitWarning === 'function') {
  proc[patchKey] = true;
  console.log('🛡️ Deprecation warnings suppressed (DEP0169).');
  const original: EmitWarning = proc.emitWarning.bind(proc);
  proc.emitWarning = function suppressDep0169Wrapper(warning: unknown, ...args: unknown[]) {
    if (shouldSilence(warning, args)) return;
    return (original as (...x: unknown[]) => void)(warning, ...args);
  };
}
