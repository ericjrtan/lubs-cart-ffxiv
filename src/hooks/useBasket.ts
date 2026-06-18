// Basket state + operations (SPEC §6 merge rules, §8 BasketItem model).
// Resolution runs through the items resolver; the working basket is persisted to
// localStorage so it survives a reload (named saved baskets come in Milestone 8).

import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { normalizeName, type ItemEntry, type ResolveResult, type Resolver } from "@/lib/items";
import { parsePasteText } from "@/lib/parse";

export interface BasketItem {
  /** Stable key used both as the React key and the merge key. */
  key: string;
  rawName: string;
  resolvedId?: number;
  resolvedName?: string;
  icon?: number;
  qty: number;
  hqOnly: boolean;
  status: ResolveResult["status"];
  suggestion?: string;
}

function mergeKey(result: ResolveResult, rawName: string): string {
  // Confirmed items merge by item id; unresolved ones stay distinct by typed name.
  if ((result.status === "matched" || result.status === "non-marketable") && result.entry) {
    return `id:${result.entry.id}`;
  }
  return `raw:${normalizeName(rawName)}`;
}

function itemFromResult(rawName: string, qty: number, result: ResolveResult): BasketItem {
  const e = result.entry;
  return {
    key: mergeKey(result, rawName),
    rawName,
    resolvedId: result.status !== "unmatched" && result.status !== "suggested" ? e?.id : undefined,
    resolvedName: result.status === "matched" || result.status === "non-marketable" ? e?.name : undefined,
    icon: e?.icon,
    qty,
    hqOnly: false,
    status: result.status,
    suggestion: result.suggestion,
  };
}

/** Insert or merge an item into the list (summing qty, OR-ing the HQ flag). */
function mergeInto(list: BasketItem[], next: BasketItem): BasketItem[] {
  const idx = list.findIndex((it) => it.key === next.key);
  if (idx === -1) return [...list, next];
  const copy = [...list];
  const existing = copy[idx];
  copy[idx] = {
    ...existing,
    qty: existing.qty + next.qty,
    hqOnly: existing.hqOnly || next.hqOnly,
  };
  return copy;
}

export interface BasketStats {
  itemCount: number;
  totalUnits: number;
  marketableCount: number;
}

export function useBasket(resolver: Resolver | null) {
  const [items, setItems] = usePersistedState<BasketItem[]>("basket", []);

  const addRawText = useCallback(
    (text: string) => {
      if (!resolver) return;
      setItems((prev) => {
        let next = prev;
        for (const { rawName, qty } of parsePasteText(text)) {
          next = mergeInto(next, itemFromResult(rawName, qty, resolver.resolve(rawName)));
        }
        return next;
      });
    },
    [resolver, setItems],
  );

  const addEntry = useCallback(
    (entry: ItemEntry, qty: number, hqOnly: boolean) => {
      const result: ResolveResult = {
        status: entry.marketable ? "matched" : "non-marketable",
        entry,
      };
      const item = { ...itemFromResult(entry.name, qty, result), hqOnly };
      setItems((prev) => mergeInto(prev, item));
    },
    [setItems],
  );

  const acceptSuggestion = useCallback(
    (key: string) => {
      if (!resolver) return;
      setItems((prev) => {
        const target = prev.find((it) => it.key === key);
        if (!target?.suggestion) return prev;
        const result = resolver.resolve(target.suggestion);
        const replacement = { ...itemFromResult(target.suggestion, target.qty, result), hqOnly: target.hqOnly };
        const without = prev.filter((it) => it.key !== key);
        return mergeInto(without, replacement);
      });
    },
    [resolver, setItems],
  );

  const setQty = useCallback(
    (key: string, qty: number) => {
      setItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, qty: Math.max(1, Math.floor(qty) || 1) } : it)),
      );
    },
    [setItems],
  );

  const toggleHq = useCallback(
    (key: string) => {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, hqOnly: !it.hqOnly } : it)));
    },
    [setItems],
  );

  const remove = useCallback(
    (key: string) => setItems((prev) => prev.filter((it) => it.key !== key)),
    [setItems],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  const replaceAll = useCallback((next: BasketItem[]) => setItems(next), [setItems]);

  const stats = useMemo<BasketStats>(
    () => ({
      itemCount: items.length,
      totalUnits: items.reduce((sum, it) => sum + it.qty, 0),
      marketableCount: items.filter((it) => it.status === "matched").length,
    }),
    [items],
  );

  return { items, addRawText, addEntry, acceptSuggestion, setQty, toggleHq, remove, clear, replaceAll, stats };
}
