// The cheapest-buy algorithms (SPEC §7).
//
// Two FFXIV constraints drive everything:
//   1. Whole-listing purchase — a listing is a stack, bought in full. Filling "need 16"
//      from stacks of 5/5/5/5 means buying 20 (overbuy 4).
//   2. The cheapest fill can span multiple worlds.
//
// Mode A (lowest-gil): pool all listings, sort by unit price, take whole stacks until
//   covered. Mode B (fewest-stops): pick the single cheapest world that can fully supply;
//   if none can, fall back to Mode A for that item.

import { config } from "@/config";
import { relativeTime } from "@/lib/time";
import { uploadKey } from "@/lib/market";
import type {
  DataCenter,
  DcGroup,
  ItemMarket,
  ItemOutcome,
  Listing,
  MarketData,
  PurchaseLine,
  Result,
  Strategy,
  World,
  WorldGroup,
} from "@/lib/types";

export interface PriceableItem {
  itemId: number;
  itemName: string;
  icon?: number;
  qty: number;
  hqOnly: boolean;
}

/** Map every reachable world *name* to its DC name (for grouping the results). */
export function buildWorldToDc(
  reachableDcs: DataCenter[],
  worldsById: Map<number, World>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const dc of reachableDcs) {
    for (const id of dc.worlds) {
      const name = worldsById.get(id)?.name;
      if (name) map.set(name, dc.name);
    }
  }
  return map;
}

const lineCost = (l: Listing) => l.pricePerUnit * l.quantity + l.tax;

/** Sort cheapest-first; on ties prefer smaller stacks to reduce overbuy. */
function byPriceThenSize(a: Listing, b: Listing): number {
  return a.pricePerUnit - b.pricePerUnit || a.quantity - b.quantity;
}

/** Greedily take whole stacks (cheapest first) until `need` is covered. */
function fillFrom(listings: Listing[], need: number): { taken: Listing[]; acquired: number } {
  const sorted = [...listings].sort(byPriceThenSize);
  const taken: Listing[] = [];
  let acquired = 0;
  for (const l of sorted) {
    taken.push(l);
    acquired += l.quantity;
    if (acquired >= need) break;
  }
  return { taken, acquired };
}

type FellBackReason = "no-single-world" | "over-budget";

interface ItemPlan {
  taken: Listing[];
  acquired: number;
  fellBackToModeA: boolean;
  fellBackReason?: FellBackReason;
}

function planModeA(listings: Listing[], need: number): ItemPlan {
  return { ...fillFrom(listings, need), fellBackToModeA: false };
}

/** A world that can fully single-source an item, with the stacks + cost to do so. */
interface WorldOption {
  taken: Listing[];
  acquired: number;
  cost: number;
}

interface ItemContext {
  item: PriceableItem;
  /** Cheapest spread (Mode A) — the budget baseline + the split fallback. */
  split: { taken: Listing[]; acquired: number };
  /** Worlds that can fully supply within (1 + tolerance) × cheapest-spread cost. */
  budgetWorlds: Map<string, WorldOption>;
  /** Some world can fully supply ignoring budget (distinguishes fallback reasons). */
  anyFullWorld: boolean;
}

function buildItemContext(item: PriceableItem, listings: Listing[], tolerance: number): ItemContext {
  const split = fillFrom(listings, item.qty);
  const canFill = split.acquired >= item.qty;
  const splitCost = canFill ? split.taken.reduce((s, l) => s + lineCost(l), 0) : Infinity;
  const budget = canFill ? splitCost * (1 + tolerance) : Infinity;

  const byWorld = new Map<string, Listing[]>();
  for (const l of listings) {
    const arr = byWorld.get(l.worldName);
    if (arr) arr.push(l);
    else byWorld.set(l.worldName, [l]);
  }

  let anyFullWorld = false;
  const budgetWorlds = new Map<string, WorldOption>();
  for (const [world, wl] of byWorld) {
    const { taken, acquired } = fillFrom(wl, item.qty);
    if (acquired < item.qty) continue;
    anyFullWorld = true;
    const cost = taken.reduce((s, l) => s + lineCost(l), 0);
    if (cost <= budget) budgetWorlds.set(world, { taken, acquired, cost });
  }
  return { item, split, budgetWorlds, anyFullWorld };
}

/**
 * Coordinated Fewest-stops (SPEC §7 + slider): minimize the *total* number of worlds
 * visited across the whole basket while keeping each item within its per-item savings
 * tolerance. Greedy weighted set-cover — repeatedly pick the world that single-sources the
 * most still-uncovered items (tie-break: cheapest) — then assign each covered item to its
 * cheapest chosen world. Items no single world can supply within budget split (Mode A).
 */
function planFewestStops(
  items: PriceableItem[],
  market: MarketData,
  tolerance: number,
): Map<number, ItemPlan> {
  const contexts = items.map((it) =>
    buildItemContext(it, filterByQuality(market.byItem.get(it.itemId), it.hqOnly), tolerance),
  );
  const ctxById = new Map(contexts.map((c) => [c.item.itemId, c]));

  // Greedy set cover over the items that *can* be single-sourced within budget.
  const uncovered = new Set(contexts.filter((c) => c.budgetWorlds.size > 0).map((c) => c.item.itemId));
  const chosenWorlds = new Set<string>();
  while (uncovered.size > 0) {
    const coverage = new Map<string, { count: number; cost: number }>();
    for (const id of uncovered) {
      for (const [world, opt] of ctxById.get(id)!.budgetWorlds) {
        const agg = coverage.get(world) ?? { count: 0, cost: 0 };
        agg.count += 1;
        agg.cost += opt.cost;
        coverage.set(world, agg);
      }
    }
    let bestWorld: string | null = null;
    let best = { count: -1, cost: Infinity };
    for (const [world, agg] of coverage) {
      if (agg.count > best.count || (agg.count === best.count && agg.cost < best.cost)) {
        best = agg;
        bestWorld = world;
      }
    }
    if (!bestWorld) break;
    chosenWorlds.add(bestWorld);
    for (const id of [...uncovered]) {
      if (ctxById.get(id)!.budgetWorlds.has(bestWorld)) uncovered.delete(id);
    }
  }

  // Build each item's plan: covered → cheapest chosen world; else split (Mode A).
  const plans = new Map<number, ItemPlan>();
  for (const ctx of contexts) {
    if (ctx.budgetWorlds.size === 0) {
      plans.set(ctx.item.itemId, {
        ...ctx.split,
        fellBackToModeA: true,
        fellBackReason: ctx.anyFullWorld ? "over-budget" : "no-single-world",
      });
      continue;
    }
    let chosen: WorldOption | null = null;
    for (const world of chosenWorlds) {
      const opt = ctx.budgetWorlds.get(world);
      if (opt && (chosen === null || opt.cost < chosen.cost)) chosen = opt;
    }
    plans.set(
      ctx.item.itemId,
      chosen
        ? { taken: chosen.taken, acquired: chosen.acquired, fellBackToModeA: false }
        : { ...ctx.split, fellBackToModeA: true, fellBackReason: "over-budget" },
    );
  }
  return plans;
}

export interface ComputeArgs {
  items: PriceableItem[];
  market: MarketData;
  worldToDc: Map<string, string>;
  strategy: Strategy;
  /** Per-item savings tolerance for Fewest-stops (0.1 = accept up to 10% more to consolidate). */
  tolerance?: number;
  /** Names of basket items flagged non-marketable (for a "get elsewhere" warning). */
  nonMarketableNames?: string[];
  now?: number;
}

export function computeResult({
  items,
  market,
  worldToDc,
  strategy,
  tolerance = 0,
  nonMarketableNames = [],
  now = Date.now(),
}: ComputeArgs): Result {
  const pct = Math.round(tolerance * 100);
  const lines: PurchaseLine[] = [];
  const itemOutcomes: ItemOutcome[] = [];
  const warnings: string[] = [];

  // Fewest-stops coordinates across the whole basket; Lowest-gil is per-item.
  const plans: Map<number, ItemPlan> =
    strategy === "fewest-stops"
      ? planFewestStops(items, market, tolerance)
      : new Map(
          items.map((it) => [
            it.itemId,
            planModeA(filterByQuality(market.byItem.get(it.itemId), it.hqOnly), it.qty),
          ]),
        );

  for (const item of items) {
    const plan = plans.get(item.itemId)!;

    // Turn the taken stacks into purchase lines.
    const lineStart = lines.length;
    for (const l of plan.taken) {
      const dc = worldToDc.get(l.worldName) ?? "Other";
      lines.push({
        itemId: item.itemId,
        itemName: item.itemName,
        itemIcon: item.icon,
        worldName: l.worldName,
        qty: l.quantity,
        pricePerUnit: l.pricePerUnit,
        hq: l.hq,
        lineTotalPreTax: l.pricePerUnit * l.quantity,
        lineTax: l.tax,
        uploadTime: market.uploadByItemDc.get(uploadKey(item.itemId, dc)),
      });
    }

    const overbuy = Math.max(0, plan.acquired - item.qty);
    // The overshoot is wasted units on the last (most expensive) stack taken.
    if (overbuy > 0 && lines.length > lineStart) {
      lines[lines.length - 1].overbuyQty = overbuy;
    }
    // Approximate overbuy cost using the most expensive taken stack's unit price.
    const dearestUnit = plan.taken.reduce((m, l) => Math.max(m, l.pricePerUnit), 0);
    itemOutcomes.push({
      itemId: item.itemId,
      itemName: item.itemName,
      needed: item.qty,
      acquired: plan.acquired,
      overbuy,
      overbuyCost: overbuy * dearestUnit,
      filled: plan.acquired >= item.qty,
      hqOnly: item.hqOnly,
      fellBackToModeA: plan.fellBackToModeA,
    });

    if (plan.acquired === 0) {
      warnings.push(
        `${item.itemName}: unavailable on reachable worlds${item.hqOnly ? " (HQ only)" : ""}.`,
      );
    } else if (plan.acquired < item.qty) {
      warnings.push(
        `${item.itemName}: got ${plan.acquired} of ${item.qty} — rest unavailable on reachable worlds.`,
      );
    }
    if (plan.fellBackToModeA && plan.acquired >= item.qty) {
      warnings.push(
        plan.fellBackReason === "over-budget"
          ? `${item.itemName}: buying it all from one world cost more than the ${pct}% budget — split across worlds to save gil.`
          : `${item.itemName}: no single world had enough — split across worlds.`,
      );
    }
  }

  // Stale-data warnings (SPEC §7 freshness) — only for prices we're actually telling the
  // user to buy, naming the culprit item + DC (not a blunt whole-DC verdict).
  const staleSeen = new Set<string>();
  for (const line of lines) {
    if (line.uploadTime === undefined || now - line.uploadTime <= config.staleDataThresholdMs) continue;
    const dc = worldToDc.get(line.worldName) ?? "Other";
    const key = `${line.itemId}@${dc}`;
    if (staleSeen.has(key)) continue;
    staleSeen.add(key);
    warnings.push(
      `${line.itemName} on ${dc}: price last updated ${relativeTime(line.uploadTime, now)} — may be off.`,
    );
  }

  // Non-marketable basket items (SPEC §5 / §12).
  for (const name of nonMarketableNames) {
    warnings.push(`${name}: not on the market board (vendor/quest item) — get it elsewhere.`);
  }

  const byDc = groupLines(lines, worldToDc);
  const grandTotalPreTax = lines.reduce((s, l) => s + l.lineTotalPreTax, 0);
  const grandTotalTax = lines.reduce((s, l) => s + l.lineTax, 0);

  return { strategy, byDc, itemOutcomes, grandTotalPreTax, grandTotalTax, warnings };
}

function filterByQuality(market: ItemMarket | undefined, hqOnly: boolean): Listing[] {
  if (!market) return [];
  return hqOnly ? market.listings.filter((l) => l.hq) : market.listings;
}

/** Group purchase lines into DC → World, with subtotals at every level. */
function groupLines(lines: PurchaseLine[], worldToDc: Map<string, string>): DcGroup[] {
  const dcs = new Map<string, Map<string, PurchaseLine[]>>();
  for (const line of lines) {
    const dc = worldToDc.get(line.worldName) ?? "Other";
    let worlds = dcs.get(dc);
    if (!worlds) {
      worlds = new Map();
      dcs.set(dc, worlds);
    }
    const arr = worlds.get(line.worldName);
    if (arr) arr.push(line);
    else worlds.set(line.worldName, [line]);
  }

  const result: DcGroup[] = [];
  for (const [dc, worlds] of dcs) {
    const worldGroups: WorldGroup[] = [];
    for (const [world, worldLines] of worlds) {
      worldGroups.push({
        world,
        lines: worldLines,
        subtotalPreTax: worldLines.reduce((s, l) => s + l.lineTotalPreTax, 0),
        subtotalTax: worldLines.reduce((s, l) => s + l.lineTax, 0),
      });
    }
    worldGroups.sort((a, b) => b.subtotalPreTax - a.subtotalPreTax);
    result.push({
      dc,
      worlds: worldGroups,
      subtotalPreTax: worldGroups.reduce((s, w) => s + w.subtotalPreTax, 0),
      subtotalTax: worldGroups.reduce((s, w) => s + w.subtotalTax, 0),
    });
  }
  result.sort((a, b) => b.subtotalPreTax - a.subtotalPreTax);
  return result;
}
