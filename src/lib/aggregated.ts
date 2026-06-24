// Universalis aggregated market stats (SPEC v1.1 §5.3). One call returns min listing price,
// average sale price, and daily sale velocity for many items at once — ideal for the Currency
// tab, which prices every item a currency can buy. Scoped to the HOME WORLD, because retainers
// only sell where they live, so that's the only price that matters for a flip.
//
// Endpoint (verified live June 2026):
//   GET /api/v2/aggregated/{worldId}/{itemIds}
// Response: { results: [{ itemId, nq:{...}, hq:{...}, worldUploadTimes:[...] }], failedItems }
// where each quality block has minListing.world.price, averageSalePrice.world.price, and
// dailySaleVelocity.world.quantity (the .dc/.region siblings are ignored — we want the world).

import { config } from "@/config";
import { fetchJsonRetry } from "@/lib/http";
import { runPool } from "@/lib/concurrency";
import type { AggregatedPrice, QualityStats } from "@/lib/types";

interface RawQuality {
  minListing?: { world?: { price?: number } };
  averageSalePrice?: { world?: { price?: number } };
  dailySaleVelocity?: { world?: { quantity?: number } };
}
interface RawResult {
  itemId?: number;
  nq?: RawQuality;
  hq?: RawQuality;
  worldUploadTimes?: Array<{ worldId?: number; timestamp?: number }>;
}
interface RawResponse {
  results?: RawResult[];
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function parseQuality(q: RawQuality | undefined): QualityStats {
  return {
    minPrice: num(q?.minListing?.world?.price),
    avgSalePrice: num(q?.averageSalePrice?.world?.price),
    salesPerDay: num(q?.dailySaleVelocity?.world?.quantity),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface FetchAggregatedArgs {
  worldId: number;
  itemIds: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Fetch aggregated home-world stats for a list of items, chunked + throttled like market.ts. */
export async function fetchAggregatedForWorld({
  worldId,
  itemIds,
  signal,
  onProgress,
}: FetchAggregatedArgs): Promise<Map<number, AggregatedPrice>> {
  const out = new Map<number, AggregatedPrice>();
  if (itemIds.length === 0) return out;

  const chunks = chunk(itemIds, config.itemIdsPerRequest);
  const tasks = chunks.map(
    (ids) => () =>
      fetchJsonRetry<RawResponse>(
        `${config.universalisBase}/aggregated/${worldId}/${ids.join(",")}`,
        { signal },
      ),
  );
  const responses = await runPool(tasks, config.maxConcurrency, config.requestDelayMs, onProgress);

  for (const resp of responses) {
    for (const r of resp.results ?? []) {
      const id = num(r.itemId);
      if (id === null) continue;
      const uploadTime =
        (r.worldUploadTimes ?? []).reduce((m, w) => Math.max(m, num(w.timestamp) ?? 0), 0) || null;
      out.set(id, {
        itemId: id,
        nq: parseQuality(r.nq),
        hq: parseQuality(r.hq),
        uploadTime,
      });
    }
  }
  return out;
}
