// src/config.ts
// All external "addresses" and tunable knobs live here so they can change without a
// code hunt. If an upstream URL ever moves, edit it here (or expose it in Advanced
// settings) — no need to touch the rest of the app.
//
// NOTE: replace ericjrtan/lubs-cart-ffxiv once the GitHub repo exists. If you enable GitHub
// Pages for the repo, you can swap the raw.githubusercontent.com URLs for the Pages URL
// (https://YOURUSER.github.io/YOURREPO/items.json) for a cleaner CDN.

export const config = {
  // --- Universalis (market board data) ---
  universalisBase: 'https://universalis.app/api/v2',

  // --- XIVAPI (item icons, fetched lazily then cached to disk) ---
  // VERIFY the live icon URL format when wiring this up (v1 xivapi.com vs v2.xivapi.com).
  xivapiIconBase: 'https://xivapi.com',

  // --- FFXIV Wiki (right-click "View on wiki") ---
  wikiBase: 'https://ffxiv.consolegameswiki.com',
  wikiSearchPath: '/index.php?search=', // fallback when a page name doesn't resolve 1:1
  // Verified June 2026: the MediaWiki API lives under /mediawiki/ (not /api.php), and
  // returns Access-Control-Allow-Origin: * so the existence check works from the webview.
  wikiApiPath: '/mediawiki/api.php',

  // --- Hosted data (live layer of the live -> cached -> bundled fallback) ---
  itemsRemoteUrl:  'https://raw.githubusercontent.com/ericjrtan/lubs-cart-ffxiv/main/public/items.json.gz',
  statusRemoteUrl: 'https://raw.githubusercontent.com/ericjrtan/lubs-cart-ffxiv/main/public/status.json',

  // --- Where friends download new versions (used by the status.json update banner) ---
  releasesUrl: 'https://github.com/ericjrtan/lubs-cart-ffxiv/releases/latest',

  // --- Networking behaviour ---
  requestTimeoutMs: 8000,    // per request; keep short so a slow network never hangs startup
  maxConcurrency: 4,         // simultaneous in-flight requests (be polite to Universalis)
  itemIdsPerRequest: 100,    // chunk size for multi-item queries (verified: 100 works live)
  listingsPerItem: 100,      // listings=N cap per item, generous so big quantities can fill
  requestDelayMs: 150,       // small gap between request starts (be polite to Cloudflare)
  maxRetries: 3,             // retries on 429 / 503 / network error (exponential backoff)
  iconBatchSize: 6,          // icons fetched in parallel per batch

  // --- Freshness ---
  staleDataThresholdMs: 1000 * 60 * 60 * 6, // warn if a DC's last upload is older than 6h

  // --- Data centers to hide (by region) ---
  // "NA Cloud DC (Beta)" is a separate beta region with no real shopping value; drop it.
  hiddenDcRegions: ['NA-Cloud-DC'] as readonly string[],

  // --- App version (compare against status.json.latestVersion to show "update available") ---
  appVersion: '1.0.0',
} as const;

export type AppConfig = typeof config;
