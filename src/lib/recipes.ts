// Recipe lookup for the Crafting tab (SPEC v1.1 §4.2). Crafting is a one-item-at-a-time
// lookup, so recipes are fetched on demand from XIVAPI v2 (no bundle) and memoized.
//
// Path (verified live June 2026):
//   1. GET /sheet/RecipeLookup/{itemId}?fields=<8 craft classes>  → a recipe id per class
//      (the item id keys the row); pick the first non-zero class — that's the recipe.
//   2. GET /sheet/Recipe/{id}?fields=AmountResult,AmountIngredient,Ingredient[].Name,
//      Ingredient[].Icon  → yield + parallel ingredient arrays.
// Non-craftable items (RecipeLookup missing or all-zero) resolve to null — the common case.

import { config } from "@/config";
import type { Recipe, RecipeIngredient } from "@/lib/types";

// The eight Disciple-of-the-Hand classes a recipe can belong to.
const CRAFT_CLASSES = ["CRP", "BSM", "ARM", "GSM", "LTW", "WVR", "ALC", "CUL"] as const;

interface LookupResponse {
  fields?: Record<string, { row_id?: number } | undefined>;
}
interface RecipeResponse {
  fields?: {
    AmountResult?: number;
    AmountIngredient?: number[];
    Ingredient?: Array<{ row_id?: number; fields?: { Name?: string; Icon?: { id?: number } } }>;
  };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.requestTimeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 404) return null; // not a craftable item / no such recipe
    if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function fetchRecipe(itemId: number, signal?: AbortSignal): Promise<Recipe | null> {
  const base = config.xivapiSheetBase;
  const lookup = await fetchJson<LookupResponse>(
    `${base}/sheet/RecipeLookup/${itemId}?fields=${CRAFT_CLASSES.join(",")}`,
    signal,
  );
  const recipeId = lookup?.fields
    ? CRAFT_CLASSES.map((c) => lookup.fields![c]?.row_id ?? 0).find((id) => id > 0)
    : undefined;
  if (!recipeId) return null; // no recipe → not craftable

  const fields = "AmountResult,AmountIngredient,Ingredient%5B%5D.Name,Ingredient%5B%5D.Icon";
  const detail = await fetchJson<RecipeResponse>(`${base}/sheet/Recipe/${recipeId}?fields=${fields}`, signal);
  const f = detail?.fields;
  if (!f || !Array.isArray(f.Ingredient)) return null;

  const amounts = f.AmountIngredient ?? [];
  const ingredients: RecipeIngredient[] = [];
  f.Ingredient.forEach((ing, i) => {
    const ingItemId = ing.row_id ?? 0;
    const amount = amounts[i] ?? 0;
    if (ingItemId <= 0 || amount <= 0) return; // empty slot
    ingredients.push({
      itemId: ingItemId,
      name: ing.fields?.Name ?? `#${ingItemId}`,
      icon: ing.fields?.Icon?.id ?? 0,
      amount,
    });
  });
  if (ingredients.length === 0) return null;

  return { itemId, recipeId, resultQty: f.AmountResult || 1, ingredients };
}

// Memoize results (including "not craftable" nulls) and de-dupe in-flight lookups.
const memo = new Map<number, Recipe | null>();
const inflight = new Map<number, Promise<Recipe | null>>();

/** Resolve an item id to its recipe, or null if it isn't craftable. Cached. */
export async function getRecipe(itemId: number, signal?: AbortSignal): Promise<Recipe | null> {
  if (memo.has(itemId)) return memo.get(itemId)!;
  let p = inflight.get(itemId);
  if (!p) {
    p = fetchRecipe(itemId, signal)
      .then((r) => {
        memo.set(itemId, r);
        return r;
      })
      .finally(() => inflight.delete(itemId));
    inflight.set(itemId, p);
  }
  return p;
}
