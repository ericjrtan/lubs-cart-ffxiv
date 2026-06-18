// Minimal semver compare for the update check (SPEC §11 / status.json).

function parts(v: string): number[] {
  return v.split(".").map((n) => parseInt(n, 10) || 0);
}

/** True if version `a` is newer than version `b` (e.g. isNewer("1.1.0", "1.0.0")). */
export function isNewer(a: string, b: string): boolean {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
