// Loads the currency index once at startup (SPEC v1.1 §5.1) and exposes it app-wide for the
// cog "Select currencies" panel and the Currency tab. Per-currency lists stay lazy (loaded on
// demand via loadCurrencyList). Pre-warms the icons of the user's selected currencies through
// the shared disk-cache so the picker + tab look populated instantly.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrencyMeta } from "@/lib/types";
import { loadCurrencyIndex } from "@/lib/currency";
import { getIconSrc } from "@/lib/iconCache";
import { useSettings } from "@/state/SettingsProvider";

type CurrencyStatus = "loading" | "ready" | "error";

interface CurrencyValue {
  currencies: CurrencyMeta[];
  byId: Map<number, CurrencyMeta>;
  status: CurrencyStatus;
  error: string | null;
}

const CurrencyContext = createContext<CurrencyValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { selectedCurrencies } = settings;

  const [currencies, setCurrencies] = useState<CurrencyMeta[]>([]);
  const [status, setStatus] = useState<CurrencyStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    setStatus("loading");
    setError(null);
    loadCurrencyIndex(ctrl.signal)
      .then((index) => {
        if (cancelled) return;
        setCurrencies(index.currencies);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const byId = useMemo(() => new Map(currencies.map((c) => [c.id, c])), [currencies]);

  // Pre-warm the selected currencies' icons (best-effort) so they're cached before display.
  useEffect(() => {
    for (const id of selectedCurrencies) {
      const icon = byId.get(id)?.icon;
      if (icon) void getIconSrc(icon);
    }
  }, [selectedCurrencies, byId]);

  const value = useMemo<CurrencyValue>(
    () => ({ currencies, byId, status, error }),
    [currencies, byId, status, error],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrencies(): CurrencyValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrencies must be used within <CurrencyProvider>");
  return ctx;
}
