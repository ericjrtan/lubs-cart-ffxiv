// XIVAPI icon URLs (SPEC §10). Verified live: v1 xivapi.com serves
// https://xivapi.com/i/{folder}/{file}.png where folder/file are the 6-digit zero-padded
// icon id (folder rounded down to the nearest 1000). Icons load lazily via <img> and are
// cached by the webview; the explicit app-data cache + "Clear icon cache" lands in M8.

import { config } from "@/config";

const pad6 = (n: number) => String(n).padStart(6, "0");

/** Build the XIVAPI icon URL for an icon id, or "" if there's no icon. */
export function iconUrl(iconId: number | undefined): string {
  if (!iconId || iconId <= 0) return "";
  const folder = pad6(Math.floor(iconId / 1000) * 1000);
  return `${config.xivapiIconBase}/i/${folder}/${pad6(iconId)}.png`;
}
