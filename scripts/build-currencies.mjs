// scripts/build-currencies.mjs
// Auto-discovers FFXIV "currencies" (Bicolor Gemstones, Scrips, Cosmocredits, Sacks of Nuts,
// beast-tribe currencies, …) and the marketable items each one buys, so the Currency tab can
// rank "best item to flip per currency" — and so NEW currencies appear automatically on the
// next data refresh, with zero code changes (SPEC v1.1 §5.2 / C0 findings).
//
// Data sources:
//   - csv/en/SpecialShop.csv from xivapi/ffxiv-datamining  (the currency -> item exchanges)
//   - public/items.json.gz                                  (names, icons, marketable flag)
//
// Run AFTER build-items (it reads the freshly built item table):
//   node scripts/build-items.mjs && node scripts/build-currencies.mjs
//
// Discovery heuristic (see documentation/v1.1-C0-findings.md):
//   A "currency" is an ItemCost item that is NON-marketable (you can't sell it on the board),
//   is not Gil, and buys at least MIN_MARKETABLE_REWARDS marketable items. Marketable items
//   used as payment (shards/crystals, gil) are item-trades, not currencies, and are excluded
//   by the non-marketable rule. Gacha/mech-op sinks (the moon/zone Cosmic credits) simply have
//   no fixed exchanges, so they never appear.

import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const SPECIAL_SHOP = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/SpecialShop.csv';
const ITEMS_GZ = 'public/items.json.gz';
const OUT_DIR = 'public/currencies';

const ENTRIES_PER_ROW = 60; // Item[0]..Item[59] exchange blocks per shop row
const COST_SLOTS = 3;       // ItemCost[0..2] / CurrencyCost[0..2]
const GIL_ID = 1;           // not a flip currency — exclude
const MIN_MARKETABLE_REWARDS = 1; // keep any currency with >=1 flippable item; the cog UI curates

async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.text();
}

function loadItemTable() {
  const table = JSON.parse(gunzipSync(readFileSync(ITEMS_GZ)).toString());
  const byId = new Map();
  for (const v of Object.values(table.items)) byId.set(v.id, v);
  return byId; // id -> { id, name, icon, marketable }
}

async function main() {
  console.log('Loading item table (public/items.json.gz) …');
  const byId = loadItemTable();
  const entry = (id) => byId.get(id);

  console.log('Fetching SpecialShop.csv …');
  const csvText = await getText(SPECIAL_SHOP);
  const rows = parse(csvText, { relax_column_count: true, skip_empty_lines: false });
  const header = rows[0];
  const col = (name) => header.indexOf(name);

  // Pre-resolve the column indices for every entry block (avoids indexOf in the hot loop).
  const cols = [];
  for (let n = 0; n < ENTRIES_PER_ROW; n++) {
    cols.push({
      recvItem: col(`Item[${n}].Item[0]`),
      recvQty: col(`Item[${n}].ReceiveCount[0]`),
      itemCost: Array.from({ length: COST_SLOTS }, (_, k) => col(`Item[${n}].ItemCost[${k}]`)),
      currencyCost: Array.from({ length: COST_SLOTS }, (_, k) => col(`Item[${n}].CurrencyCost[${k}]`)),
    });
  }
  if (cols[0].recvItem === -1 || cols[0].itemCost[0] === -1) {
    throw new Error('SpecialShop header changed (Item[N].Item[0]/ItemCost[0] not found) — update this script.');
  }

  // currencyId -> Map(rewardItemId -> { receiveQty, costQty })  (keep cheapest cost per item)
  const byCurrency = new Map();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (const c of cols) {
      const rewardItem = Number(row[c.recvItem]) || 0;
      if (rewardItem <= 0) continue;
      const receiveQty = Number(row[c.recvQty]) || 1;
      for (let k = 0; k < COST_SLOTS; k++) {
        const currencyId = Number(row[c.itemCost[k]]) || 0;
        const costQty = Number(row[c.currencyCost[k]]) || 0;
        if (currencyId <= 0 || costQty <= 0) continue;
        let bucket = byCurrency.get(currencyId);
        if (!bucket) byCurrency.set(currencyId, (bucket = new Map()));
        const prev = bucket.get(rewardItem);
        if (!prev || costQty < prev.costQty) bucket.set(rewardItem, { receiveQty, costQty });
      }
    }
  }

  // Apply the currency heuristic + build the per-currency reward lists (marketable only —
  // you can only flip what you can sell).
  const index = [];
  mkdirSync(OUT_DIR, { recursive: true });

  for (const [currencyId, rewards] of byCurrency) {
    const cur = entry(currencyId);
    if (!cur) continue;                       // unknown id (item table older than the patch)
    if (cur.marketable) continue;             // marketable cost = item trade, not a currency
    if (currencyId === GIL_ID) continue;      // gil shops aren't flip currencies

    const items = [];
    for (const [itemId, { receiveQty, costQty }] of rewards) {
      const it = entry(itemId);
      if (!it || !it.marketable) continue;    // only flippable rewards
      items.push({ itemId, name: it.name, icon: it.icon, costQty, receiveQty });
    }
    if (items.length < MIN_MARKETABLE_REWARDS) continue;

    // Cheapest currency cost first — a reasonable default order for the UI.
    items.sort((a, b) => a.costQty - b.costQty);
    writeFileSync(`${OUT_DIR}/${currencyId}.json`, JSON.stringify(items));
    index.push({ id: currencyId, name: cur.name, icon: cur.icon, itemCount: items.length });
  }

  // Best-stocked currencies first, so the picker leads with the useful ones.
  index.sort((a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name));

  const payload = {
    version: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    count: index.length,
    currencies: index,
  };
  writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify(payload));
  console.log(
    `Wrote ${OUT_DIR}/index.json + ${index.length} per-currency files ` +
      `(min ${MIN_MARKETABLE_REWARDS} marketable rewards). Top 5: ` +
      index.slice(0, 5).map((c) => `${c.name}(${c.itemCount})`).join(', '),
  );
}

main().catch((e) => {
  console.error('build-currencies failed:', e.message);
  process.exit(1);
});
