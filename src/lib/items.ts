// Offline item-name resolution (SPEC §5). Operates on the bundled public/items.json,
// whose keys are normalized names → { id, icon, marketable, name }.
//
// Resolution order: exact normalized match → fuzzy "did you mean" → unmatched.
// A match whose `marketable` is false is surfaced (not dropped) as 'non-marketable'.

export interface ItemEntry {
  id: number;
  icon: number;
  marketable: boolean;
  name: string; // canonical display name (original casing)
}

export interface ItemsTable {
  version: string;
  items: Record<string, ItemEntry>;
}

export type ResolveStatus = "matched" | "suggested" | "unmatched" | "non-marketable";

export interface ResolveResult {
  status: ResolveStatus;
  /** The matched entry (matched/non-marketable) or the best guess (suggested). */
  entry?: ItemEntry;
  /** Display name of the suggestion, present only when status === 'suggested'. */
  suggestion?: string;
}

/** Must mirror scripts/build-items.mjs `norm()` exactly so keys line up. */
export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Levenshtein distance with an early-exit once the best possible exceeds `maxDist`. */
function boundedLevenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1; // whole row already too far
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function fuzzyThreshold(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

export interface Resolver {
  version: string;
  size: number;
  resolve: (rawName: string) => ResolveResult;
  search: (query: string, limit?: number) => ItemEntry[];
}

export function createResolver(table: ItemsTable): Resolver {
  const items = table.items;
  const keys = Object.keys(items);

  function resolve(rawName: string): ResolveResult {
    const norm = normalizeName(rawName);
    if (!norm) return { status: "unmatched" };

    const exact = items[norm];
    if (exact) {
      return { status: exact.marketable ? "matched" : "non-marketable", entry: exact };
    }

    // Fuzzy fallback — nearest key within an edit-distance budget.
    const maxDist = fuzzyThreshold(norm.length);
    let best: ItemEntry | undefined;
    let bestDist = maxDist + 1;
    for (const key of keys) {
      if (Math.abs(key.length - norm.length) > maxDist) continue;
      const d = boundedLevenshtein(norm, key, maxDist);
      if (d < bestDist) {
        bestDist = d;
        best = items[key];
        if (d === 1) break; // good enough, stop early
      }
    }
    if (best && bestDist <= maxDist) {
      return { status: "suggested", entry: best, suggestion: best.name };
    }
    return { status: "unmatched" };
  }

  function search(query: string, limit = 8): ItemEntry[] {
    const q = normalizeName(query);
    if (q.length < 2) return [];
    const prefix: ItemEntry[] = [];
    const contains: ItemEntry[] = [];
    for (const key of keys) {
      const idx = key.indexOf(q);
      if (idx === 0) prefix.push(items[key]);
      else if (idx > 0) contains.push(items[key]);
      if (prefix.length >= limit) break;
    }
    const byLen = (a: ItemEntry, b: ItemEntry) => a.name.length - b.name.length;
    prefix.sort(byLen);
    contains.sort(byLen);
    return [...prefix, ...contains].slice(0, limit);
  }

  return { version: table.version, size: keys.length, resolve, search };
}
