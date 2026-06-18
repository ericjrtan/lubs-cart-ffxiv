// Market-data fetching (SPEC §3 / §4). Queries each reachable data center for the
// basket's item ids — one request per DC covers every world in that DC — chunking ids to
// ≤100 per request, throttled via the concurrency pool, then normalizes + aggregates the
// listings for the cheapest-buy algorithms (Milestone 5).

import { config } from "@/config";
import { fetchJsonRetry } from "@/lib/http";
import { runPool } from "@/lib/concurrency";
import type { DataCenter, DcFreshness, ItemMarket, Listing, MarketData } from "@/lib/types";

// Field allowlist (verified live): the `items.` prefix is correct for multi-item queries.
const FIELDS = [
  "items.listings.pricePerUnit",
  "items.listings.quantity",
  "items.listings.worldName",
  "items.listings.hq",
  "items.listings.tax",
  "items.lastUploadTime",
  "items.itemID",
  "unresolvedItems",
].join(",");

interface RawListing {
  worldName?: string;
  pricePerUnit?: number;
  quantity?: number;
  hq?: boolean;
  tax?: number;
}
interface RawItem {
  itemID?: number;
  lastUploadTime?: number;
  listings?: RawListing[];
}
interface RawResponse {
  items?: Record<string, RawItem>;
  unresolvedItems?: number[];
  // single-item (flat) shape:
  itemID?: number;
  lastUploadTime?: number;
  listings?: RawListing[];
}

interface ChunkResult {
  dc: string;
  perItem: Map<number, { lastUploadTime: number; listings: Listing[] }>;
  unresolved: number[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normListings(arr: RawListing[] | undefined): Listing[] {
  if (!Array.isArray(arr)) return [];
  const out: Listing[] = [];
  for (const l of arr) {
    const pricePerUnit = Number(l.pricePerUnit) || 0;
    const quantity = Number(l.quantity) || 0;
    const worldName = String(l.worldName ?? "");
    if (pricePerUnit <= 0 || quantity <= 0 || !worldName) continue; // skip junk rows
    out.push({ worldName, pricePerUnit, quantity, hq: Boolean(l.hq), tax: Number(l.tax) || 0 });
  }
  return out;
}

/** Normalize either the multi-item (`items` map) or single-item (flat) response shape. */
function normalizeResponse(json: RawResponse): Omit<ChunkResult, "dc"> {
  const perItem = new Map<number, { lastUploadTime: number; listings: Listing[] }>();

  if (json.items && typeof json.items === "object") {
    for (const [key, v] of Object.entries(json.items)) {
      const id = Number(v.itemID ?? key);
      perItem.set(id, { lastUploadTime: Number(v.lastUploadTime) || 0, listings: normListings(v.listings) });
    }
  } else if (json.itemID != null || Array.isArray(json.listings)) {
    // Single-item query came back flat.
    const id = Number(json.itemID);
    if (Number.isFinite(id)) {
      perItem.set(id, { lastUploadTime: Number(json.lastUploadTime) || 0, listings: normListings(json.listings) });
    }
  }

  const unresolved = Array.isArray(json.unresolvedItems)
    ? json.unresolvedItems.map(Number).filter(Number.isFinite)
    : [];
  return { perItem, unresolved };
}

function buildUrl(dc: string, ids: number[]): string {
  const path = `${config.universalisBase}/${encodeURIComponent(dc)}/${ids.join(",")}`;
  // Keep the field list's commas raw (verified to work); only the value needs no encoding.
  return `${path}?listings=${config.listingsPerItem}&entries=0&fields=${FIELDS}`;
}

async function fetchChunk(dc: string, ids: number[], signal?: AbortSignal): Promise<ChunkResult> {
  const json = await fetchJsonRetry<RawResponse>(buildUrl(dc, ids), { signal });
  return { dc, ...normalizeResponse(json) };
}

export interface FetchMarketArgs {
  reachableDcs: DataCenter[];
  itemIds: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Fetch + aggregate market data for the whole basket across every reachable DC. */
export async function fetchMarketForBasket({
  reachableDcs,
  itemIds,
  signal,
  onProgress,
}: FetchMarketArgs): Promise<MarketData> {
  const requests: Array<{ dc: string; ids: number[] }> = [];
  for (const dc of reachableDcs) {
    for (const ids of chunk(itemIds, config.itemIdsPerRequest)) {
      requests.push({ dc: dc.name, ids });
    }
  }

  const tasks = requests.map((r) => () => fetchChunk(r.dc, r.ids, signal));
  const chunkResults = await runPool(tasks, config.maxConcurrency, config.requestDelayMs, onProgress);

  // Aggregate: merge listings per item across DCs; track per-DC oldest + per item+DC upload.
  const byItem = new Map<number, ItemMarket>();
  const dcOldest = new Map<string, number>();
  const uploadByItemDc = new Map<string, number>();

  for (const { dc, perItem } of chunkResults) {
    for (const [id, m] of perItem) {
      let it = byItem.get(id);
      if (!it) {
        it = { itemId: id, listings: [], lastUploadTime: 0 };
        byItem.set(id, it);
      }
      it.listings.push(...m.listings);
      it.lastUploadTime = Math.max(it.lastUploadTime, m.lastUploadTime);

      if (m.lastUploadTime > 0) {
        uploadByItemDc.set(uploadKey(id, dc), m.lastUploadTime);
        const cur = dcOldest.get(dc);
        dcOldest.set(dc, cur === undefined ? m.lastUploadTime : Math.min(cur, m.lastUploadTime));
      }
    }
  }

  const worldSet = new Set<string>();
  for (const it of byItem.values()) for (const l of it.listings) worldSet.add(l.worldName);

  const dcFreshness: DcFreshness[] = [...dcOldest.entries()].map(([dc, oldestUpload]) => ({
    dc,
    oldestUpload,
  }));

  // Overall unresolved = requested ids that never returned a listing anywhere.
  const unresolved = itemIds.filter((id) => !byItem.has(id));

  return {
    byItem,
    dcFreshness,
    uploadByItemDc,
    unresolved,
    worldsCovered: worldSet.size,
    requestCount: requests.length,
  };
}

/** Key for MarketData.uploadByItemDc. */
export function uploadKey(itemId: number, dc: string): string {
  return `${itemId}@${dc}`;
}
