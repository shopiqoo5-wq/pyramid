/**
 * Suppress DEP0169 warnings globally.
 */
const patchKey = Symbol.for('pyramid.suppressDep0169');

function patch() {
  const proc = process as any;
  if (proc[patchKey]) return;
  proc[patchKey] = true;

  const originalEmit = proc.emitWarning;
  if (typeof originalEmit !== 'function') return;

  console.log('🛡️  Shield Active: Suppressing DEP0169');

  proc.emitWarning = function(warning: any, ...args: any[]) {
    const message = typeof warning === 'string' ? warning : (warning?.message || '');
    const code = warning?.code || (typeof args[0] === 'string' ? args[0] : '');

    if (code === 'DEP0169' || /url\.parse\(\)/i.test(message)) {
      return;
    }
    return originalEmit.apply(proc, [warning, ...args]);
  };
}

patch();

export default {};
