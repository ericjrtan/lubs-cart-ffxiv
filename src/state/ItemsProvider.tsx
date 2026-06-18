// Loads the bundled item table (public/items.json) once and exposes a resolver for
// name → item lookup, fuzzy "did you mean", and autocomplete search (SPEC §5).
// The file ships inside the app, so it's always available offline.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createResolver, type ItemsTable, type Resolver } from "@/lib/items";

type ItemsStatus = "loading" | "ready" | "error";

interface ItemsValue {
  status: ItemsStatus;
  resolver: Resolver | null;
  version: string | null;
  error: string | null;
}

const ItemsContext = createContext<ItemsValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [resolver, setResolver] = useState<Resolver | null>(null);
  const [status, setStatus] = useState<ItemsStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/items.json.gz")
      .then(async (r) => {
        if (!r.ok) throw new Error(`items.json.gz → HTTP ${r.status}`);
        const buf = new Uint8Array(await r.arrayBuffer());
        // Inflate only if it's still gzip (magic bytes 1f 8b). If something upstream already
        // applied Content-Encoding, fetch will have decompressed it — parse as-is then.
        const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
        let text: string;
        if (isGzip) {
          const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
          text = await new Response(stream).text();
        } else {
          text = new TextDecoder().decode(buf);
        }
        return JSON.parse(text) as ItemsTable;
      })
      .then((table) => {
        if (cancelled) return;
        setResolver(createResolver(table));
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ItemsValue>(
    () => ({ status, resolver, version: resolver?.version ?? null, error }),
    [status, resolver, error],
  );

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems(): ItemsValue {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error("useItems must be used within <ItemsProvider>");
  return ctx;
}
