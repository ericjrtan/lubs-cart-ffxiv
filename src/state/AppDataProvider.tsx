// Loads the Universalis reference data (data centers + worlds) once at startup and makes
// it available app-wide (SPEC §3: "fetch /data-centers and /worlds once at startup and
// cache them, so the DC/world list stays current automatically").
//
// Resilience (SPEC §12): seeds instantly from the localStorage cache, fetches fresh in
// the background, and — if the network fails — keeps serving the cached data offline.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataCenter, World } from "@/lib/types";
import { fetchDataCenters, fetchWorlds } from "@/lib/universalis";
import { readCache, writeCache } from "@/lib/cache";
import { config } from "@/config";

/** Drop data centers in hidden regions (e.g. the NA Cloud DC beta), per config. */
function visibleDcs(dcs: DataCenter[]): DataCenter[] {
  return dcs.filter((dc) => !config.hiddenDcRegions.includes(dc.region));
}

type LoadStatus = "loading" | "ready" | "error";

interface AppDataValue {
  dataCenters: DataCenter[];
  worlds: World[];
  worldsById: Map<number, World>;
  status: LoadStatus;
  /** True when showing cached data because the live fetch failed (offline). */
  fromCache: boolean;
  /** When the data currently shown was fetched/cached (epoch ms), or null. */
  fetchedAt: number | null;
  error: string | null;
  reload: () => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

const DC_KEY = "data-centers";
const WORLDS_KEY = "worlds";

export function AppDataProvider({ children }: { children: ReactNode }) {
  const dcCache = readCache<DataCenter[]>(DC_KEY);
  const worldsCache = readCache<World[]>(WORLDS_KEY);

  const [dataCenters, setDataCenters] = useState<DataCenter[]>(visibleDcs(dcCache?.data ?? []));
  const [worlds, setWorlds] = useState<World[]>(worldsCache?.data ?? []);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [fromCache, setFromCache] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(dcCache?.savedAt ?? null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    setStatus("loading");
    setError(null);

    Promise.all([fetchDataCenters(ctrl.signal), fetchWorlds(ctrl.signal)])
      .then(([dcs, ws]) => {
        if (cancelled) return;
        setDataCenters(visibleDcs(dcs));
        setWorlds(ws);
        setFetchedAt(Date.now());
        setFromCache(false);
        setStatus("ready");
        writeCache(DC_KEY, dcs);
        writeCache(WORLDS_KEY, ws);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        // Fall back to cached data if we have it; otherwise this is a hard error.
        const haveCache = dataCenters.length > 0 && worlds.length > 0;
        setError(msg);
        setFromCache(haveCache);
        setStatus(haveCache ? "ready" : "error");
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const value = useMemo<AppDataValue>(() => {
    const worldsById = new Map(worlds.map((w) => [w.id, w]));
    return {
      dataCenters,
      worlds,
      worldsById,
      status,
      fromCache,
      fetchedAt,
      error,
      reload: () => setReloadKey((k) => k + 1),
    };
  }, [dataCenters, worlds, status, fromCache, fetchedAt, error]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within <AppDataProvider>");
  return ctx;
}
