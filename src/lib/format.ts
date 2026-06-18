// Gil formatting + result presentation helpers.

import type { PurchaseLine, WorldGroup } from "@/lib/types";

/** e.g. 1234567 → "1,234,567 g" */
export function gil(n: number): string {
  return `${Math.round(n).toLocaleString()} g`;
}

export interface MergedStack {
  qty: number;
  pricePerUnit: number;
  hq: boolean;
}

/** One item's combined purchases within a single world (SPEC: merge repeated lines). */
export interface MergedItemRow {
  itemId: number;
  itemName: string;
  itemIcon?: number;
  totalQty: number;
  totalPreTax: number;
  totalTax: number;
  overbuyQty: number;
  allHq: boolean;
  /** Last upload time (epoch ms) for this item on this world's DC. */
  uploadTime?: number;
  stacks: MergedStack[]; // the individual listings, cheapest first (the "price spread")
}

/** Collapse a world's per-stack purchase lines into one row per item. */
export function mergeLinesByItem(lines: PurchaseLine[]): MergedItemRow[] {
  const byItem = new Map<number, MergedItemRow>();
  const order: number[] = [];
  for (const l of lines) {
    let row = byItem.get(l.itemId);
    if (!row) {
      row = {
        itemId: l.itemId,
        itemName: l.itemName,
        itemIcon: l.itemIcon,
        totalQty: 0,
        totalPreTax: 0,
        totalTax: 0,
        overbuyQty: 0,
        allHq: true,
        uploadTime: l.uploadTime,
        stacks: [],
      };
      byItem.set(l.itemId, row);
      order.push(l.itemId);
    }
    row.totalQty += l.qty;
    row.totalPreTax += l.lineTotalPreTax;
    row.totalTax += l.lineTax;
    row.overbuyQty += l.overbuyQty ?? 0;
    row.allHq = row.allHq && l.hq;
    row.stacks.push({ qty: l.qty, pricePerUnit: l.pricePerUnit, hq: l.hq });
  }
  for (const row of byItem.values()) row.stacks.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  return order.map((id) => byItem.get(id)!);
}

/** Compact price-spread string, e.g. "8 @1,500 · 8 @1,600 HQ". */
export function spreadText(stacks: MergedStack[]): string {
  return stacks
    .map((s) => `${s.qty} @${s.pricePerUnit.toLocaleString()}${s.hq ? " HQ" : ""}`)
    .join(" · ");
}

/** Plain-text checklist of a world's purchases, for the "copy list" button (SPEC §9). */
export function worldListText(w: WorldGroup): string {
  const rows = mergeLinesByItem(w.lines).map((r) => {
    const spread = r.stacks.length > 1 ? ` (${spreadText(r.stacks)})` : "";
    return `☐ ${r.itemName}${r.allHq ? " (HQ)" : ""} ×${r.totalQty}${spread} = ${gil(
      r.totalPreTax + r.totalTax,
    )}`;
  });
  return `${w.world} — ${gil(w.subtotalPreTax + w.subtotalTax)}\n${rows.join("\n")}`;
}
