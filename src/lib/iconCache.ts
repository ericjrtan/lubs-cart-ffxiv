// Disk-cached item icons (SPEC §10). Fetches each PNG via the Tauri HTTP plugin (Rust
// side — reliable in the packaged app, where the webview won't load these external images),
// caches it under the app-cache dir, and serves it as a blob URL. Later loads read from
// disk — instant and offline.
//
// Network fetches are limited to a few at a time (SPEC §10 "small parallel batches") so a
// screen full of items loads quickly instead of flooding. Best-effort throughout: any
// failure falls back to the direct URL so icons still try to show.

import { BaseDirectory, exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { iconUrl } from "@/lib/icons";

const DIR = "icons";
const baseDir = BaseDirectory.AppCache;
const memo = new Map<number, string>(); // icon id → resolved src
const inflight = new Map<number, Promise<string>>();
let dirReady: Promise<void> | null = null;

// --- tiny concurrency gate for the network fetches ---
const MAX_CONCURRENT = 8;
let active = 0;
const waiters: Array<() => void> = [];
function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve)).then(() => {
    active++;
  });
}
function release() {
  active--;
  waiters.shift()?.();
}

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
  await acquire();
  try {
    const res = await tauriFetch(iconUrl(id));
    if (!res.ok) throw new Error(`icon ${id} → HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    await ensureDir();
    await writeFile(path, bytes, { baseDir });
    return toObjectUrl(id, bytes);
  } finally {
    release();
  }
}

/** Resolve an icon id to a displayable src (disk-cached via Rust). */
export async function getIconSrc(iconId: number | undefined): Promise<string> {
  if (!iconId || iconId <= 0) return "";
  const cached = memo.get(iconId);
  if (cached) return cached;
  let p = inflight.get(iconId);
  if (!p) {
    p = loadOrFetch(iconId)
      .catch(() => {
        const direct = iconUrl(iconId); // last resort
        memo.set(iconId, direct);
        return direct;
      })
      .finally(() => inflight.delete(iconId));
    inflight.set(iconId, p);
  }
  return p;
}
