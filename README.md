# 🛒 Lub's Cart

**An unofficial FFXIV market-board shopping tool.** Paste a list of items (or build one by
hand), and Lub's Cart tells you the cheapest way to buy everything across the worlds you can
reach — grouped by data center and world, with a running total.

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

- Paste `Item Name: qty` lists (tolerant of typos and other formats) or add items manually.
- Cheapest-buy across all worlds you can reach, with a **regional-travel** toggle.
- Two strategies: **lowest total gil** or **fewest stops** — your choice.
- Totals shown **with and without** market tax.
- Results grouped by **Data Center → World**, with a copy-list button per world.
- Item icons + right-click **"View on FFXIV Wiki"** + hover preview.
- Saved baskets for reusing big lists.

---

## 🧑‍💻 Build from source

Requires [Node.js](https://nodejs.org) 20+ and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust + WebView2; WebView2 is
already on most Windows machines).

```bash
npm install
npm run build:items      # generate public/items.json.gz (item name -> id table)
npm run tauri dev        # run the app in dev mode
npm run tauri build      # produce the distributable .exe / installer
```


---

## 🔄 How item data stays current

The item table (`public/items.json.gz`) is regenerated automatically by a scheduled GitHub
Action ([`.github/workflows/update-items.yml`](./.github/workflows/update-items.yml)) from
[xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining) + the Universalis
marketable list.

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

## ⚖️ Disclaimer

Lub's Cart is an unofficial, non-commercial fan tool. It is **not affiliated with or endorsed
by Square Enix**. FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All rights reserved. All game
content, item names, and icons are the property of Square Enix.
