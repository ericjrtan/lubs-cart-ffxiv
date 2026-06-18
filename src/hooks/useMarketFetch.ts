// Drives a market-data fetch (SPEC §3) with progress + cancellation, for the Generate
// button. Snapshots the reachable DCs used for the fetch so the result stays "locked" to
// the settings it was generated with (toggling travel afterward doesn't corrupt it).

import { useCallback, useRef, useState } from "react";
import { fetchMarketForBasket } from "@/lib/market";
import type { DataCenter, MarketData } from "@/lib/types";

type MarketStatus = "idle" | "loading" | "done" | "error";

interface MarketState {
  status: MarketStatus;
  progress: { done: number; total: number };
  data: MarketData | null;
  /** The reachable DCs this result was generated against (for grouping). */
  reachableDcs: DataCenter[];
  error: string | null;
}

const IDLE: MarketState = {
  status: "idle",
  progress: { done: 0, total: 0 },
  data: null,
  reachableDcs: [],
  error: null,
};

export function useMarketFetch() {
  const [state, setState] = useState<MarketState>(IDLE);
  const ctrlRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (reachableDcs: DataCenter[], itemIds: number[]) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setState({ status: "loading", progress: { done: 0, total: 0 }, data: null, reachableDcs, error: null });
    try {
      const data = await fetchMarketForBasket({
        reachableDcs,
        itemIds,
        signal: ctrl.signal,
        onProgress: (done, total) =>
          setState((s) => (ctrl.signal.aborted ? s : { ...s, progress: { done, total } })),
      });
      if (ctrl.signal.aborted) return;
      setState({
        status: "done",
        progress: { done: data.requestCount, total: data.requestCount },
        data,
        reachableDcs,
        error: null,
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setState({
        status: "error",
        progress: { done: 0, total: 0 },
        data: null,
        reachableDcs,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  const reset = useCallback(() => {
    ctrlRef.current?.abort();
    setState(IDLE);
  }, []);

  return { ...state, generate, reset };
}
