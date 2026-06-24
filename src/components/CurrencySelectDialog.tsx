// Cog → "Select currencies" panel (SPEC v1.1 §5.1). A searchable multi-select over the
// auto-discovered currencies; the user's picks persist to settings (selectedCurrencies) and
// drive what the Currency tab shows. Plain panel + backdrop (no portalled dialog) to match
// BasketMenu / SettingsDialog and stay click-safe. Toggles apply immediately.

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemIcon } from "@/components/ItemIcon";
import { useCurrencies } from "@/state/CurrencyProvider";
import { useSettings } from "@/state/SettingsProvider";
import { normalizeName } from "@/lib/items";

export function CurrencySelectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currencies, status } = useCurrencies();
  const { settings, setSelectedCurrencies, setCurrencyBudget } = useSettings();
  const selected = settings.selectedCurrencies;
  const budgets = settings.currencyBudgets;
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return currencies;
    return currencies.filter((c) => normalizeName(c.name).includes(q));
  }, [currencies, query]);

  if (!open) return null;

  function toggle(id: number) {
    setSelectedCurrencies(
      selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }

  // Entering a budget implies you want that currency — auto-select it.
  function setBudget(id: number, value: string) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setCurrencyBudget(id, n);
    if (n > 0 && !selectedSet.has(id)) setSelectedCurrencies([...selected, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">Select currencies</h2>
            <p className="text-xs text-muted-foreground">
              {selected.length} selected · {currencies.length} available
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currencies…"
              className="h-8 pl-8"
            />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {status === "loading" && (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading currencies…</div>
          )}
          {status === "error" && (
            <div className="p-6 text-center text-sm text-destructive">
              Couldn't load the currency list.
            </div>
          )}
          {status === "ready" && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No matches.</div>
          )}
          {filtered.map((c) => {
            const on = selectedSet.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent ${on ? "bg-accent/60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={on}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <ItemIcon icon={c.icon} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {c.itemCount} items
                  </span>
                </button>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={budgets[c.id] ? String(budgets[c.id]) : ""}
                  onChange={(e) => setBudget(c.id, e.target.value)}
                  placeholder="have…"
                  title="How much of this currency you have"
                  className="h-7 w-20 shrink-0 text-right tabular-nums"
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={selected.length === 0}
            onClick={() => setSelectedCurrencies([])}
          >
            Clear all
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
