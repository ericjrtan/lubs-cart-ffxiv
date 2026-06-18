// Paste-box parser (SPEC §6). Accepts the primary `Item Name: qty` plus tolerant
// variants, defaulting qty to 1. Returns one entry per non-blank line (merging happens
// later, in the basket, so unmatched lines can still merge by name).

export interface ParsedEntry {
  rawName: string;
  qty: number;
}

const clampQty = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 1);

/** Parse a single line into { rawName, qty }, or null if it's blank. */
export function parseLine(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Tab-separated: "Item Name\tN"
  if (trimmed.includes("\t")) {
    const [name, rest] = trimmed.split("\t");
    const qty = parseInt((rest ?? "").trim(), 10);
    if (name.trim()) return { rawName: name.trim(), qty: clampQty(qty) };
  }

  // 2. "Item Name: qty"
  let m = trimmed.match(/^(.*\S)\s*:\s*(\d+)\s*$/);
  if (m) return { rawName: m[1].trim(), qty: clampQty(parseInt(m[2], 10)) };

  // 3. "N x Item Name"  (check the leading-count form before the trailing one)
  m = trimmed.match(/^(\d+)\s*[x×*]\s*(.+\S)\s*$/i);
  if (m) return { rawName: m[2].trim(), qty: clampQty(parseInt(m[1], 10)) };

  // 4. "Item Name xN"
  m = trimmed.match(/^(.+?\S)\s*[x×*]\s*(\d+)\s*$/i);
  if (m) return { rawName: m[1].trim(), qty: clampQty(parseInt(m[2], 10)) };

  // 5. Bare name, default qty 1. (We deliberately don't treat a trailing bare number as a
  //    quantity — many item names legitimately end in numbers.)
  return { rawName: trimmed, qty: 1 };
}

export function parsePasteText(text: string): ParsedEntry[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((e): e is ParsedEntry => e !== null);
}
