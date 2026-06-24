// Currency exchange data loader (SPEC v1.1 §5.2). Loads the auto-generated currency index
// and per-currency flippable-item lists, each via the live -> cached -> bundled fallback
// (same resilience pattern as items.json): try the hosted copy first, fall back to the last
// cached copy, and finally to the copy bundled inside the app. The app is always usable from
// the bundled layer alone; the network only makes it current.
//
// The index is loaded once at startup (tiny). Per-currency lists are loaded lazily — only
// when a currency is actually opened — and memoized, so "load only what's active" stays cheap.

import { config } from "@/config";
import { readCache, writeCache } from "@/lib/cache";
import type { CurrencyExchangeItem, CurrencyIndex } from "@/lib/types";

const INDEX_CACHE_KEY = "currencies:index";
const listCacheKey = (id: number) => `currencies:list:${id}`;

/** Single fetch with a short timeout, so a slow network never hangs startup. */
async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.requestTimeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

const liveUrl = (file: string) => `${config.currenciesUrlBase}${file}`;
const bundledUrl = (file: string) => `${config.currenciesBundledBase}${file}`;

/**
 * Load the currency index: hosted → cached → bundled. Writes the cache on a live hit so the
 * next launch is instant and offline-safe. The bundled copy is the guaranteed floor.
 */
export async function loadCurrencyIndex(signal?: AbortSignal): Promise<CurrencyIndex> {
  try {
    const live = await fetchJson<CurrencyIndex>(liveUrl("index.json"), signal);
    writeCache(INDEX_CACHE_KEY, live);
    return live;
  } catch {
    const cached = readCache<CurrencyIndex>(INDEX_CACHE_KEY);
    if (cached) return cached.data;
    return fetchJson<CurrencyIndex>(bundledUrl("index.json"), signal);
  }
}

const memo = new Map<number, CurrencyExchangeItem[]>();

/**
 * Load one currency's flippable items: hosted → cached → bundled, memoized in-memory so
 * re-opening a currency is instant. Lazy — nothing is fetched until a currency is opened.
 */
export async function loadCurrencyList(
  currencyId: number,
  signal?: AbortSignal,
): Promise<CurrencyExchangeItem[]> {
  const cachedMemo = memo.get(currencyId);
  if (cachedMemo) return cachedMemo;

  const file = `${currencyId}.json`;
  let list: CurrencyExchangeItem[];
  try {
    list = await fetchJson<CurrencyExchangeItem[]>(liveUrl(file), signal);
    writeCache(listCacheKey(currencyId), list);
  } catch {
    const cached = readCache<CurrencyExchangeItem[]>(listCacheKey(currencyId));
    list = cached ? cached.data : await fetchJson<CurrencyExchangeItem[]>(bundledUrl(file), signal);
  }
  memo.set(currencyId, list);
  return list;
}
