// Tiny localStorage cache. Used to keep the last-known /data-centers and /worlds so the
// app opens instantly and still works offline (SPEC §3 "fetch once and cache", §12
// "network failure → clear error state if it persists").
//
// NOTE: Milestone 8 formalizes settings/basket persistence to a Tauri app-data file.
// Reference-data caching and lightweight prefs live in localStorage for now.

const PREFIX = "lubscart:";

interface CacheEnvelope<T> {
  savedAt: number; // epoch ms
  data: T;
}

export function readCache<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof env?.savedAt !== "number") return null;
    return { data: env.data, savedAt: env.savedAt };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const env: CacheEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    // Storage full / unavailable — non-fatal; live data still works in-memory.
  }
}
