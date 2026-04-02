export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // RFC4122 v4 fallback
  let d = new Date().getTime();
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16;
      d2 = Math.floor(d2 / 16);
    }
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return Math.floor(v).toString(16);
  });
}

