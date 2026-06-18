// Disk-cached item icons (SPEC §10). Fetches each PNG once via the Tauri HTTP plugin
// (Rust-side, so XIVAPI's lack of CORS doesn't matter), stores it under the app-cache dir,
// and serves it as a blob URL. Subsequent loads read from disk — instant and offline.
//
// Everything is best-effort: on any failure (not in Tauri, offline, permission) it falls
// back to the direct XIVAPI URL so icons still display. "Clear icon cache" wipes the folder.

import { BaseDirectory, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { iconUrl } from "@/lib/icons";

const DIR = "icons";
const baseDir = BaseDirectory.AppCache;
const memo = new Map<number, string>(); // icon id → resolved src (blob URL or direct URL)
const inflight = new Map<number, Promise<string>>();
let dirReady: Promise<void> | null = null;

const pathFor = (id: number) => `${DIR}/${id}.png`;

function ensureDir(): Promise<void> {
  if (!dirReady) dirReady = mkdir(DIR, { baseDir, recursive: true }).catch(() => {});
  return dirReady;
}

function toObjectUrl(id: number, bytes: Uint8Array): string {
  const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
  memo.set(id, url);
  return url;
}

async function loadOrFetch(id: number): Promise<string> {
  const path = pathFor(id);
  if (await exists(path, { baseDir })) {
    return toObjectUrl(id, await readFile(path, { baseDir }));
  }
  const res = await tauriFetch(iconUrl(id));
  if (!res.ok) throw new Error(`icon ${id} → HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await ensureDir();
  await writeFile(path, bytes, { baseDir });
  return toObjectUrl(id, bytes);
}

/** Resolve an icon id to a displayable src (cached on disk where possible). */
export async function getIconSrc(iconId: number | undefined): Promise<string> {
  if (!iconId || iconId <= 0) return "";
  const cached = memo.get(iconId);
  if (cached) return cached;
  let p = inflight.get(iconId);
  if (!p) {
    p = loadOrFetch(iconId)
      .catch(() => {
        // Fall back to the direct URL (the webview will still load + HTTP-cache it).
        const direct = iconUrl(iconId);
        memo.set(iconId, direct);
        return direct;
      })
      .finally(() => inflight.delete(iconId));
    inflight.set(iconId, p);
  }
  return p;
}

/** Delete the on-disk icon cache. Live images keep their current src until remounted. */
export async function clearIconCache(): Promise<void> {
  memo.clear();
  inflight.clear();
  dirReady = null;
  try {
    await remove(DIR, { baseDir, recursive: true });
  } catch {
    /* folder may not exist yet */
  }
}
