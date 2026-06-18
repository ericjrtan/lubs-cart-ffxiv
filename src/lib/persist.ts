// Thin wrapper over the Tauri Store plugin — persists settings + saved baskets to a JSON
// file in the app-data dir (SPEC §11). Auto-saves on change. All calls are defensive so a
// store failure never crashes the app (it just falls back to in-memory defaults).

import { load, type Store } from "@tauri-apps/plugin-store";

let storePromise: Promise<Store> | null = null;

function store(): Promise<Store> {
  // autoSave defaults to on (100ms debounce); `defaults` is required by the type.
  if (!storePromise) storePromise = load("lubs-cart.json", { defaults: {} });
  return storePromise;
}

export async function getValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await (await store()).get<T>(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setValue<T>(key: string, value: T): Promise<void> {
  try {
    await (await store()).set(key, value);
  } catch {
    /* persistence unavailable — keep going with in-memory state */
  }
}
