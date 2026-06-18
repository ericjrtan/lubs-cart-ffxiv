// Data-center / region travel model (SPEC §4).
//
// The rule, encoded once, is correct for all global regions (NA / EU / JP / Oceania):
//   - No travel:  only the worlds of the home DC.
//   - Travel on:  every DC whose region matches the home DC's region, PLUS the Materia
//                 DC (Oceania), which any region may visit.
//   - Exception:  if the home DC *is* Materia, the reachable set is Materia only
//                 (Materia natives can't leave their region).
//
// Materia is identified by DC *name* (its region is "Oceania"), per the spec.

import type { DataCenter, World } from "@/lib/types";

export const MATERIA_DC_NAME = "Materia";

/**
 * The set of data centers a player on `homeDcName` can shop, given the travel toggle.
 * Returns [] if the home DC name isn't found in `dataCenters`.
 */
export function getReachableDcs(
  homeDcName: string,
  dataCenters: DataCenter[],
  travelAllowed: boolean,
): DataCenter[] {
  const home = dataCenters.find((dc) => dc.name === homeDcName);
  if (!home) return [];

  // No travel → home DC only.
  if (!travelAllowed) return [home];

  // Materia natives can't leave their region, even with travel on.
  if (home.name === MATERIA_DC_NAME) return [home];

  // Travel on → same-region DCs, plus Materia (visitable from any region).
  const reachable = dataCenters.filter((dc) => dc.region === home.region);
  const materia = dataCenters.find((dc) => dc.name === MATERIA_DC_NAME);
  if (materia && !reachable.includes(materia)) reachable.push(materia);
  return reachable;
}

/** Flatten reachable DCs to their world ids (deduped). */
export function getReachableWorldIds(reachableDcs: DataCenter[]): number[] {
  return [...new Set(reachableDcs.flatMap((dc) => dc.worlds))];
}

/** Resolve reachable world ids to names via the worlds list (unknown ids dropped). */
export function getReachableWorldNames(
  reachableDcs: DataCenter[],
  worldsById: Map<number, World>,
): string[] {
  return getReachableWorldIds(reachableDcs)
    .map((id) => worldsById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
}
