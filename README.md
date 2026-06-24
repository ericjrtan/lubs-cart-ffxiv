# 🛒 Lub's Cart

**An unofficial FFXIV market-board toolkit.** Three tools in one window:

- **🛒 Cart** — paste a shopping list (or build one by hand) and get the cheapest way to buy
  everything across the worlds you can reach, grouped by data center and world.
- **🔨 Crafting** — pick a craftable item and see whether buying its components is cheaper
  than buying it outright, plus the profit if you craft it and sell on your own world.
- **🪙 Currency** — for an end-game currency (Bicolor Gemstones, Cosmocredits, Scrips…), see
  which items give the most gil per unit sold on your world, plus a "spend what I have for
  the most gil" shopping plan.

Great for big projects like housing pre-builds that give you a shopping list.
---

## ⬇️ Download

**[→ Download the latest version](https://github.com/ericjrtan/lubs-cart-ffxiv/releases/latest)**

1. Click the link above and download the `.exe` (or installer) under **Assets**.
2. Run it. The first time, Windows may show a blue **"Windows protected your PC"** screen
   because the app isn't code-signed — click **More info → Run anyway**. (It's safe; that
   warning just means it's from an indie dev, not a verified publisher.)

> First launch needs internet to pull current prices and item icons; after that, item
> icons are cached locally. Your prices always come live from Universalis.

---

## ✨ Features

### 🛒 Cart — cheapest shopping list
- Paste `Item Name: qty` lists (tolerant of typos and other formats) or add items manually.
- Cheapest-buy across all worlds you can reach, with a **regional-travel** toggle.
- Two strategies: **lowest total gil** or **fewest stops** — your choice.
- Totals shown **with and without** market tax.
- Results grouped by **Data Center → World**, with a copy-list button per world.
- Saved baskets for reusing big lists.

### 🔨 Crafting — craft vs. buy
- Search any craftable item; recipes are pulled live from XIVAPI.
- Compares **craft cost** (cheapest components across your data center) against **buy cost**,
  and shows the **% you'd save** by crafting.
- **Craft-and-sell profit** if you sell the result on your home world, with how fast it sells.
- Full "buy these components here" breakdown, reusing the Cart engine.

### 🪙 Currency — best items to buy for gil
- **Auto-discovers** every end-game currency with sellable rewards (Bicolor Gemstones,
  Cosmocredits, Scrips, Sacks of Nuts, MGP, beast-tribe currencies…) — new ones appear by
  themselves as patches add them.
- Ranks the items a currency can buy by **gil per currency** or **sales per day**, priced on
  **your** world (where your retainers sell). Troll/cap-price and rarely-sold listings filtered out.
- **Budget plan:** enter how much you hold → a shopping list that maximises gil, capped to
  ~a week of sales so you can actually move it.
- **Click-to-copy prices** as clean numbers for the market-board sell window.

Shared everywhere: item icons, right-click **"View on FFXIV Wiki"**, and hover previews.

---

## 🧑‍💻 Build from source

Requires [Node.js](https://nodejs.org) 20+ and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust + WebView2; WebView2 is
already on most Windows machines).

```bash
npm install
npm run build:items       # generate public/items.json.gz (item name -> id table)
npm run build:currencies  # generate public/currencies/* (run AFTER build:items)
npm run tauri dev         # run the app in dev mode
npm run tauri build       # produce the distributable .exe / installer
```


---

## 🔄 How item data stays current

The item table (`public/items.json.gz`) and the currency exchange tables
(`public/currencies/`) are regenerated automatically by a scheduled GitHub Action
([`.github/workflows/update-items.yml`](./.github/workflows/update-items.yml)) from
[xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining) + the Universalis
marketable list. New items and currencies appear on next launch with no rebuild; recipes are
fetched live from XIVAPI on demand.

---

## 🙏 Credits & data

Lub's Cart is built on the work of the FFXIV community — please support these projects:

- **Market-board prices:** [Universalis](https://universalis.app) and its data contributors.
- **Item data & icons:** [XIVAPI](https://xivapi.com) and [ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining).
  Item **names and artwork** are the property of **Square Enix** — icons are fetched from
  XIVAPI on demand and cached locally per user; they are **not bundled** in this app.
- **Item reference pages:** [FFXIV Console Games Wiki](https://ffxiv.consolegameswiki.com).
- **App logo & UI theme:** original artwork made for Lub's Cart (no Square Enix assets).

---
## AI USAGE

Lub's Cart definetely used AI.

## ⚖️ Disclaimer

Lub's Cart is an unofficial, non-commercial fan tool. It is **not affiliated with or endorsed
by Square Enix**. FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All rights reserved. All game
content, item names, and icons are the property of Square Enix.
