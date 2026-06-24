// Flip / profit math for the Currency tab (SPEC v1.1 §5.4). For a chosen currency, rank the
// items it can buy by how much gil each unit of that currency yields when the item is sold on
// the home world — "what sells best for this currency, and what to buy."
//
// (The Crafting tab's craft-vs-buy math will share this module in B2.)

import { config } from "@/config";
import type { AggregatedPrice, CurrencyExchangeItem } from "@/lib/types";

export interface FlipRow {
  itemId: number;
  name: string;
  icon: number;
  costQty: number; // currency paid per exchange
  receiveQty: number; // items received per exchange
  /** Home-world current lowest listing, per unit (junk/cap prices removed) — null if none. */
  minPrice: number | null;
  /** Recent average realized sale price, per unit (context + junk fallback). */
  avgSalePrice: number | null;
  /** Daily sale velocity on the home world (how fast it moves). */
  salesPerDay: number | null;
  /** Gil received per unit of currency spent — the headline ranking number. */
  gilPerCurrency: number | null;
  /** Gil from one exchange (sale price × receiveQty, after sell tax). */
  revenuePerExchange: number | null;
  /** Newest home-world upload time (epoch ms) for staleness. */
  uploadTime: number | null;
}

export type FlipSort = "gil-per-currency" | "sales-per-day";

/** Drop troll/cap listings (sellers park items just under the gil cap) so they don't win. */
function sane(price: number | null): number | null {
  return price !== null && price < config.junkPriceThreshold ? price : null;
}

/**
 * Build the ranked flip rows. Prices come from the home world's NQ stats (most currency
 * rewards are NQ), falling back to HQ. The headline gil/currency uses the current min listing
 * with junk (cap-price) listings removed, falling back to the recent average sale price when
 * the only listing is junk. Items with no usable price get null and sort to the bottom.
 */
export function computeFlips(
  items: CurrencyExchangeItem[],
  prices: Map<number, AggregatedPrice>,
  sort: FlipSort = "gil-per-currency",
): FlipRow[] {
  const taxFactor = 1 - config.sellTaxRate;

  const rows = items.map((it): FlipRow => {
    const agg = prices.get(it.itemId);
    const minPrice = sane(agg?.nq.minPrice ?? agg?.hq.minPrice ?? null);
    const avgSalePrice = agg?.nq.avgSalePrice ?? agg?.hq.avgSalePrice ?? null;
    const salesPerDay = agg?.nq.salesPerDay ?? agg?.hq.salesPerDay ?? null;

    // Rank on the current listing; if it's junk/missing, fall back to the realized average.
    const basis = minPrice ?? avgSalePrice;
    const revenuePerExchange = basis !== null ? basis * it.receiveQty * taxFactor : null;
    const gilPerCurrency =
      revenuePerExchange !== null && it.costQty > 0 ? revenuePerExchange / it.costQty : null;

    return {
      itemId: it.itemId,
      name: it.name,
      icon: it.icon,
      costQty: it.costQty,
      receiveQty: it.receiveQty,
      minPrice,
      avgSalePrice,
      salesPerDay,
      gilPerCurrency,
      revenuePerExchange,
      uploadTime: agg?.uploadTime ?? null,
    };
  });

  // Sort by the chosen metric, nulls always last.
  const key = (r: FlipRow) => (sort === "sales-per-day" ? r.salesPerDay : r.gilPerCurrency);
  rows.sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  });
  return rows;
}

export interface BudgetAllocation {
  row: FlipRow;
  exchanges: number; // how many times you trade the currency for this item
  itemsBought: number; // exchanges × receiveQty
  spent: number; // currency spent on this item
  gil: number; // projected gil from selling them
  capped: boolean; // true if the velocity cap (not the budget) limited this item
}

export interface BudgetPlan {
  allocations: BudgetAllocation[];
  totalGil: number;
  totalSpent: number;
  leftover: number; // currency left unspent — not enough demand to flip more in the horizon
}

/**
 * "I have N currency — buy this for the most gil." Greedy down the gil/currency ranking, but
 * each item is capped by what you can realistically sell within `horizonDays` (sales/day ×
 * horizon), so the plan spreads across items instead of telling you to dump 1,700 of one thing
 * that only sells ~24/day. Greedy-by-ratio with per-item caps is optimal for a single budget.
 * Leftover currency means the reachable demand is exhausted — buying more wouldn't sell.
 */
export function optimizeBudget(
  rows: FlipRow[],
  budget: number,
  horizonDays: number,
): BudgetPlan {
  const ranked = rows
    .filter((r) => r.gilPerCurrency !== null && r.revenuePerExchange !== null && r.costQty > 0)
    .sort((a, b) => (b.gilPerCurrency ?? 0) - (a.gilPerCurrency ?? 0));

  const allocations: BudgetAllocation[] = [];
  let remaining = budget;
  for (const r of ranked) {
    if (remaining < r.costQty) continue;
    // How many you can realistically sell in the horizon → how many exchanges that allows.
    const sellable = Math.floor((r.salesPerDay ?? 0) * horizonDays);
    const capExchanges = Math.floor(sellable / Math.max(1, r.receiveQty));
    if (capExchanges <= 0) continue; // can't move any within the horizon
    const budgetExchanges = Math.floor(remaining / r.costQty);
    const exchanges = Math.min(capExchanges, budgetExchanges);
    if (exchanges <= 0) continue;
    const spent = exchanges * r.costQty;
    allocations.push({
      row: r,
      exchanges,
      itemsBought: exchanges * r.receiveQty,
      spent,
      gil: exchanges * (r.revenuePerExchange ?? 0),
      capped: exchanges === capExchanges && capExchanges < budgetExchanges,
    });
    remaining -= spent;
  }

  return {
    allocations,
    totalGil: allocations.reduce((s, a) => s + a.gil, 0),
    totalSpent: budget - remaining,
    leftover: remaining,
  };
}
