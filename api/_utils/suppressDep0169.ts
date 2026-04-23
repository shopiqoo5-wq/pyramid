/**
 * NUCLEAR OPTION: Suppress DEP0169 warnings by patching stdout/stderr and emitWarning.
 */
const patchKey = Symbol.for('pyramid.suppressDep0169.v2');

function patch() {
  const proc = process as any;
  if (proc[patchKey]) return;
  proc[patchKey] = true;

  // 1. Patch emitWarning (Standard way)
  const originalEmit = proc.emitWarning;
  if (typeof originalEmit === 'function') {
    proc.emitWarning = function(warning: any, ...args: any[]) {
      const msg = typeof warning === 'string' ? warning : (warning?.message || '');
      if (/DEP0169|url\.parse\(\)/i.test(msg)) return;
      return originalEmit.apply(proc, [warning, ...args]);
    };
  }

  // 2. Patch stderr (Aggressive way for libraries that write directly)
  const originalStderrWrite = proc.stderr.write;
  proc.stderr.write = function(chunk: any, encoding: any, callback: any) {
    const str = chunk.toString();
    if (/DEP0169|url\.parse\(\)/i.test(str)) {
        if (typeof callback === 'function') callback();
        return true;
    }
    return originalStderrWrite.apply(proc.stderr, [chunk, encoding, callback]);
  };

  console.log('🛡️  Deep Shield Active: DEP0169 Blocked.');
}

try {
  patch();
} catch {
  // Silent fail
}

export default {};
