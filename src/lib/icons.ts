// XIVAPI icon URLs (SPEC §10). Uses v2.xivapi.com's asset endpoint, which has every icon
// (the old v1 CDN 404s newer items) and serves it as PNG:
//   /api/asset?path=ui/icon/<folder>/<file>.tex&format=png
// where <folder>/<file> are the 6-digit zero-padded icon id (folder = id floored to 1000).

import { config } from "@/config";

const pad6 = (n: number) => String(n).padStart(6, "0");

/** Build the XIVAPI (v2) icon URL for an icon id, or "" if there's no icon. */
export function iconUrl(iconId: number | undefined): string {
  if (!iconId || iconId <= 0) return "";
  const folder = pad6(Math.floor(iconId / 1000) * 1000);
  return `${config.xivapiIconBase}/api/asset?path=ui/icon/${folder}/${pad6(iconId)}.tex&format=png`;
}
