// Thin Universalis API client. All calls go directly from the webview — Universalis
// returns `access-control-allow-origin: *`, so no Rust proxy is needed (SPEC §2).
//
// Reference endpoints live here; market-data fetching (chunking + aggregation) lives in
// lib/market.ts. Both share the resilient lib/http.ts fetcher.

import { config } from "@/config";
import { fetchJsonRetry } from "@/lib/http";
import type { DataCenter, World } from "@/lib/types";

export function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return fetchJsonRetry<T>(`${config.universalisBase}${path}`, { signal });
}

export function fetchDataCenters(signal?: AbortSignal): Promise<DataCenter[]> {
  return fetchJson<DataCenter[]>("/data-centers", signal);
}

export function fetchWorlds(signal?: AbortSignal): Promise<World[]> {
  return fetchJson<World[]>("/worlds", signal);
}
