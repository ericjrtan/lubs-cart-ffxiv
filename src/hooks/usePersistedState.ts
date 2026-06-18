// A useState that mirrors to localStorage, for small user preferences (home DC, travel
// toggle, strategy). Milestone 8 will migrate these to the Tauri app-data file.

import { useCallback, useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";

export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readCache<T>(key)?.data ?? initial);

  useEffect(() => {
    writeCache(key, value);
  }, [key, value]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => setValue((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next)),
    [],
  );

  return [value, set];
}
