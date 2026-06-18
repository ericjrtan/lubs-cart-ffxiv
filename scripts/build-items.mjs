// scripts/build-items.mjs
// Regenerates public/items.json — a normalized item-name -> {id, icon, marketable} map
// used by Lub's Cart to turn typed names into Universalis item IDs (and to show icons).
//
// Data sources:
//   - English Item.csv from xivapi/ffxiv-datamining  (item id, Name, Icon id)
//   - Universalis /api/v2/marketable                  (which item ids are sellable)
//
// Run locally:        node scripts/build-items.mjs
// Skip the network marketable lookup (offline test): SKIP_MARKETABLE=1 node scripts/build-items.mjs
//
// NOTE (verified June 2026): the English CSVs live under csv/en/ (not csv/), and Item.csv
// has a SINGLE header row (line 1 = column names, data from line 2). Columns are located
// by header NAME, not fixed index, so a future column re-order won't silently break this.

import { parse } from 'csv-parse/sync';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const ITEM_CSV   = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/Item.csv';
const MARKETABLE = 'https://universalis.app/api/v2/marketable';
// Ship gzipped — the app fetches this and inflates it in the webview (DecompressionStream).
// ~5x smaller transfer than raw JSON, so startup loads the item table much faster.
const OUT        = 'public/items.json.gz';

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.text();
}
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.json();
}

async function main() {
  console.log('Fetching Item.csv …');
  const csvText = await getText(ITEM_CSV);

  const rows = parse(csvText, { relax_column_count: true, skip_empty_lines: false });
  const header = rows[0];
  const nameCol = header.indexOf('Name');
  const iconCol = header.indexOf('Icon');
  if (nameCol === -1 || iconCol === -1) {
    throw new Error('Could not find "Name"/"Icon" columns — the CSV header changed; update this script.');
  }

  let marketable = new Set();
  if (process.env.SKIP_MARKETABLE) {
    console.warn('SKIP_MARKETABLE set — every item will be flagged marketable:false (test mode).');
  } else {
    console.log('Fetching marketable item list …');
    marketable = new Set(await getJson(MARKETABLE));
  }

  const items = {};
  for (let i = 1; i < rows.length; i++) {       // data starts at line 2 (index 1)
    const r = rows[i];
    const id = Number(r[0]);
    const name = (r[nameCol] || '').trim();
    if (!Number.isFinite(id) || id <= 0 || !name) continue;   // skip blanks / placeholder rows
    items[norm(name)] = {
      id,
      icon: Number(r[iconCol]) || 0,
      marketable: marketable.has(id),
      name,                          // canonical display name (casing kept for UI + wiki URL)
    };
  }

  mkdirSync('public', { recursive: true });
  const payload = {
    version: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    count: Object.keys(items).length,
    items,
  };
  const json = JSON.stringify(payload);
  const gz = gzipSync(json, { level: 9 });
  writeFileSync(OUT, gz);
  console.log(
    `Wrote ${OUT}: ${payload.count} items, version ${payload.version} ` +
      `(${(gz.length / 1e6).toFixed(2)} MB gzipped from ${(json.length / 1e6).toFixed(2)} MB).`,
  );
}

main().catch((e) => {
  console.error('build-items failed:', e.message);
  process.exit(1);
});
