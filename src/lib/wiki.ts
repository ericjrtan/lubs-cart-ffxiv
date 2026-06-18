// FFXIV Console Games Wiki links (SPEC §10). Right-click → open the item's page in the
// user's default browser via the Tauri opener plugin. Canonical URL uses the item's
// proper-cased name with spaces → underscores; if the page doesn't exist 1:1 we fall back
// to the wiki search so it never dead-ends.

import { openUrl } from "@tauri-apps/plugin-opener";
import { config } from "@/config";

export function wikiUrl(name: string): string {
  return `${config.wikiBase}/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

export function wikiSearchUrl(name: string): string {
  return `${config.wikiBase}${config.wikiSearchPath}${encodeURIComponent(name)}`;
}

/**
 * Open the item's wiki page. Best-effort: check existence via the MediaWiki API (which
 * allows CORS with origin=*); on a miss open the search page, and if the check itself
 * fails just open the canonical URL.
 */
export async function openItemWiki(name: string): Promise<void> {
  try {
    const api = `${config.wikiBase}${config.wikiApiPath}?action=query&format=json&origin=*&titles=${encodeURIComponent(
      name,
    )}`;
    const res = await fetch(api, { signal: AbortSignal.timeout(2500) });
    const data = (await res.json()) as { query?: { pages?: Record<string, { missing?: string }> } };
    const pages = data.query?.pages ?? {};
    const missing = Object.values(pages).some((p) => p.missing !== undefined);
    await openUrl(missing ? wikiSearchUrl(name) : wikiUrl(name));
  } catch {
    await openUrl(wikiUrl(name)); // network/API failed — just try the canonical page
  }
}
