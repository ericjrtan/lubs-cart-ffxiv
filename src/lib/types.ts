// Shared domain types for Lub's Cart.
// Universalis shapes verified live against https://universalis.app/api/v2 (June 2026).

/** One data center, from GET /api/v2/data-centers. */
export interface DataCenter {
  name: string;
  /** e.g. "Japan", "North-America", "Europe", "Oceania". Materia's region is "Oceania". */
  region: string;
  /** World ids belonging to this DC (resolve names via the worlds map). */
  worlds: number[];
}

/** One world, from GET /api/v2/worlds. */
export interface World {
  id: number;
  name: string;
}

/** A single market listing, normalized from Universalis (SPEC §8). */
export interface Listing {
  worldName: string;
  pricePerUnit: number;
  quantity: number; // stack size — bought whole (SPEC §7)
  hq: boolean;
  tax: number; // total tax for the whole stack
}

/** Aggregated listings for one item across every reachable world. */
export interface ItemMarket {
  itemId: number;
  listings: Listing[];
  /** Most recent upload time seen for this item anywhere (epoch ms). */
  lastUploadTime: number;
}

/** Freshness of one data center: the oldest item upload we saw there (epoch ms). */
export interface DcFreshness {
  dc: string;
  oldestUpload: number;
}

/** Everything the cheapest-buy algorithms (Milestone 5) need. */
export interface MarketData {
  byItem: Map<number, ItemMarket>;
  dcFreshness: DcFreshness[];
  /** Per item+DC last upload time (epoch ms), keyed `${itemId}@${dc}` — for per-purchase freshness. */
  uploadByItemDc: Map<string, number>;
  /** Item ids with no listings on any reachable world. */
  unresolved: number[];
  /** Distinct world names that returned at least one listing. */
  worldsCovered: number;
  requestCount: number;
}

/** Top-level app tabs (v1.1 — SPEC v1.1 §3.1). */
export type AppTab = "cart" | "crafting" | "currency";

// --- Cheapest-buy results (SPEC §7 / §8) ---

export type Strategy = "lowest-gil" | "fewest-stops";

/** One stack to buy on one world (a whole listing). */
export interface PurchaseLine {
  itemId: number;
  itemName: string;
  itemIcon?: number;
  worldName: string;
  qty: number; // units from this listing (= the stack size, bought whole)
  pricePerUnit: number;
  hq: boolean;
  lineTotalPreTax: number; // pricePerUnit * qty
  lineTax: number; // the listing's stack tax
  /** Units wasted on this line from whole-stack rounding (set on the overshooting stack). */
  overbuyQty?: number;
  /** Last upload time (epoch ms) for this item on this line's DC — for staleness. */
  uploadTime?: number;
}

export interface WorldGroup {
  world: string;
  lines: PurchaseLine[];
  subtotalPreTax: number;
  subtotalTax: number;
}

export interface DcGroup {
  dc: string;
  worlds: WorldGroup[];
  subtotalPreTax: number;
  subtotalTax: number;
}

/** Per-item outcome, for overbuy badges + partial-fill warnings. */
export interface ItemOutcome {
  itemId: number;
  itemName: string;
  needed: number;
  acquired: number; // total units bought
  overbuy: number; // acquired - needed (>= 0)
  overbuyCost: number; // pre-tax gil spent on the overbought units (approx)
  filled: boolean; // acquired >= needed
  hqOnly: boolean;
  fellBackToModeA: boolean; // Mode B couldn't single-source this item
}

export interface Result {
  strategy: Strategy;
  byDc: DcGroup[];
  itemOutcomes: ItemOutcome[];
  grandTotalPreTax: number;
  grandTotalTax: number;
  warnings: string[];
}
