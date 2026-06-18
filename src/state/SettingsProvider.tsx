// App settings + named saved baskets, persisted to an app-data file via the Store plugin
// (SPEC §11). Loads on startup; every change auto-saves. Falls back to in-memory defaults
// if persistence is unavailable.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getValue, setValue } from "@/lib/persist";
import type { Strategy } from "@/lib/types";
import type { BasketItem } from "@/hooks/useBasket";

export interface Settings {
  homeDc: string | null;
  travelAllowed: boolean;
  strategy: Strategy;
  tolerance: number;
}

const DEFAULTS: Settings = {
  homeDc: null,
  travelAllowed: false,
  strategy: "lowest-gil",
  tolerance: 0.1,
};

export interface SavedBasket {
  name: string;
  items: BasketItem[];
  savedAt: number;
}

interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  setHomeDc: (dc: string | null) => void;
  setTravel: (on: boolean) => void;
  setStrategy: (s: Strategy) => void;
  setTolerance: (t: number) => void;
  savedBaskets: SavedBasket[];
  saveBasket: (name: string, items: BasketItem[]) => void;
  getBasket: (name: string) => SavedBasket | undefined;
  deleteBasket: (name: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [savedBaskets, setSavedBaskets] = useState<SavedBasket[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, b] = await Promise.all([
        getValue<Partial<Settings>>("settings", {}),
        getValue<SavedBasket[]>("baskets", []),
      ]);
      if (cancelled) return;
      setSettings({ ...DEFAULTS, ...s });
      setSavedBaskets(Array.isArray(b) ? b : []);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((p: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...p };
      void setValue("settings", next);
      return next;
    });
  }, []);

  const persistBaskets = useCallback((next: SavedBasket[]) => {
    setSavedBaskets(next);
    void setValue("baskets", next);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      setHomeDc: (homeDc) => patch({ homeDc }),
      setTravel: (travelAllowed) => patch({ travelAllowed }),
      setStrategy: (strategy) => patch({ strategy }),
      setTolerance: (tolerance) => patch({ tolerance }),
      savedBaskets,
      saveBasket: (name, items) =>
        persistBaskets(
          [...savedBaskets.filter((b) => b.name !== name), { name, items, savedAt: Date.now() }].sort(
            (a, b) => a.name.localeCompare(b.name),
          ),
        ),
      getBasket: (name) => savedBaskets.find((b) => b.name === name),
      deleteBasket: (name) => persistBaskets(savedBaskets.filter((b) => b.name !== name)),
    }),
    [settings, ready, savedBaskets, patch, persistBaskets],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
