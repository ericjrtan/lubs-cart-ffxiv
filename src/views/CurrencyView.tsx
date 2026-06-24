// Currency tool (SPEC v1.1 §5): best items to buy for gil with an end-game currency. Pick one
// of your selected currencies → the tab loads its buyable items, prices them on your home world
// (current listing + sale velocity), and ranks them by gil-per-currency / sales-per-day.

import { useEffect, useMemo, useState } from "react";
import { Check, Coins, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ItemIcon } from "@/components/ItemIcon";
import { ItemLabel } from "@/components/ItemLabel";
import { CurrencySelectDialog } from "@/components/CurrencySelectDialog";
import { useCurrencies } from "@/state/CurrencyProvider";
import { useSettings } from "@/state/SettingsProvider";
import { useAppData } from "@/state/AppDataProvider";
import { loadCurrencyList } from "@/lib/currency";
import { fetchAggregatedForWorld } from "@/lib/aggregated";
import { computeFlips, optimizeBudget, type FlipRow, type FlipSort } from "@/lib/profit";
import { gil } from "@/lib/format";
import { config } from "@/config";
import type { AggregatedPrice, CurrencyExchangeItem } from "@/lib/types";

/** gil-per-currency can be fractional — keep one decimal under 100 so small values survive. */
function perCurrency(n: number | null): string {
  if (n === null) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 1 : 0 })} g`;
}

/** A market price shown with commas but click-to-copied as a bare integer for the sell window. */
function CopyPrice({ value }: { value: number | null }) {
  const [copied, setCopied] = useState(false);
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const rounded = Math.round(value);
  async function copy() {
    try {
      await navigator.clipboard.writeText(String(rounded));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy price (paste into the market-board sell window)"
      className="group/cp inline-flex items-center gap-1 tabular-nums hover:text-foreground"
    >
      {rounded.toLocaleString()}
      {copied ? (
        <Check className="size-3 text-emerald-400" />
      ) : (
        <Copy className="size-3 opacity-0 transition-opacity group-hover/cp:opacity-50" />
      )}
    </button>
  );
}

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; items: CurrencyExchangeItem[]; prices: Map<number, AggregatedPrice> };

function useFlipData(currencyId: number | null, worldId: number | null): LoadState {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    if (currencyId === null || worldId === null) {
      setState({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      const items = await loadCurrencyList(currencyId, ctrl.signal);
      const prices = await fetchAggregatedForWorld({
        worldId,
        itemIds: items.map((i) => i.itemId),
        signal: ctrl.signal,
      });
      if (!cancelled) setState({ status: "ready", items, prices });
    })().catch((e: unknown) => {
      if (!cancelled) setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [currencyId, worldId]);

  return state;
}

function EmptyState({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/40 p-8 text-center">
        <Coins className="size-8 text-muted-foreground" />
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{children}</p>
        {action}
      </div>
    </div>
  );
}

export function CurrencyView() {
  const { byId } = useCurrencies();
  const { settings } = useSettings();
  const { worldsById } = useAppData();
  const { selectedCurrencies, homeWorld } = settings;

  const [activeId, setActiveId] = useState<number | null>(null);
  const [sort, setSort] = useState<FlipSort>("gil-per-currency");
  const [hideRarelySold, setHideRarelySold] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);

  // Default the active currency to the first selected; keep it valid as selections change.
  useEffect(() => {
    if (activeId === null || !selectedCurrencies.includes(activeId)) {
      setActiveId(selectedCurrencies[0] ?? null);
    }
  }, [selectedCurrencies, activeId]);

  const data = useFlipData(activeId, homeWorld);
  const rows = useMemo<FlipRow[]>(
    () => (data.status === "ready" ? computeFlips(data.items, data.prices, sort) : []),
    [data, sort],
  );
  const visibleRows = useMemo(
    () =>
      hideRarelySold
        ? rows.filter((r) => (r.salesPerDay ?? 0) >= config.lowVelocityThreshold)
        : rows,
    [rows, hideRarelySold],
  );
  const hiddenCount = rows.length - visibleRows.length;

  const homeWorldName = homeWorld !== null ? (worldsById.get(homeWorld)?.name ?? null) : null;
  const activeCurrency = activeId !== null ? byId.get(activeId) : undefined;

  const budget = activeId !== null ? (settings.currencyBudgets[activeId] ?? 0) : 0;
  const plan = useMemo(
    () =>
      budget > 0 && data.status === "ready"
        ? optimizeBudget(visibleRows, budget, config.budgetSellHorizonDays)
        : null,
    [budget, visibleRows, data.status],
  );

  let body: React.ReactNode;
  if (selectedCurrencies.length === 0) {
    body = (
      <EmptyState
        title="No currencies selected"
        action={
          <Button size="sm" onClick={() => setSelectOpen(true)}>
            <Coins className="size-3.5" />
            Select currencies
          </Button>
        }
      >
        Choose which end-game currencies to track (Bicolor Gemstones, Cosmocredits, Scrips…)
        and enter how much of each you have.
      </EmptyState>
    );
  } else if (homeWorld === null) {
    body = (
      <EmptyState title="Set your home world">
        Pick your <span className="font-medium">Home World</span> in the header — sell prices
        come from the world your retainers list on.
      </EmptyState>
    );
  } else {
    body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {/* Currency chips */}
      <div className="flex flex-wrap items-center gap-2">
        {selectedCurrencies.map((id) => {
          const c = byId.get(id);
          const on = id === activeId;
          return (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={on ? "secondary" : "ghost"}
              className="gap-1.5"
              onClick={() => setActiveId(id)}
            >
              <ItemIcon icon={c?.icon} size={18} />
              {c?.name ?? `#${id}`}
            </Button>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setSelectOpen(true)}
        >
          <Coins className="size-3.5" />
          Select currencies
        </Button>
      </div>

      {/* Sub-header: what we're showing */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {activeCurrency ? (
            <>
              Best items to buy with <span className="font-medium text-foreground">{activeCurrency.name}</span>{" "}
              and sell on <span className="font-medium text-foreground">{homeWorldName}</span>
            </>
          ) : (
            "Pick a currency above"
          )}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="hide-rarely-sold"
              checked={hideRarelySold}
              onCheckedChange={setHideRarelySold}
            />
            <Label htmlFor="hide-rarely-sold" className="whitespace-nowrap text-xs text-muted-foreground">
              Hide rarely sold{hiddenCount > 0 ? ` (${hiddenCount})` : ""}
            </Label>
          </div>
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              size="xs"
              variant={sort === "gil-per-currency" ? "secondary" : "ghost"}
              onClick={() => setSort("gil-per-currency")}
            >
              Most gil / currency
            </Button>
            <Button
              size="xs"
              variant={sort === "sales-per-day" ? "secondary" : "ghost"}
              onClick={() => setSort("sales-per-day")}
            >
              Most sales / day
            </Button>
          </div>
        </div>
      </div>

      {/* Budget plan — "I have N currency → buy this for the most gil" */}
      {plan && plan.allocations.length > 0 && activeCurrency && (
        <div className="rounded-2xl border border-[#e8c170]/40 bg-[#e8c170]/10 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="flex items-center gap-1 text-sm">
              With <span className="font-medium">{budget.toLocaleString()} {activeCurrency.name}</span>, buy:
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="How is this plan calculated?"
                      className="self-center text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <span className="text-xs leading-snug">
                    Spends your currency on the best gil-per-currency items first, but caps each
                    one to about {config.budgetSellHorizonDays} days of sales (its sales/day ×{" "}
                    {config.budgetSellHorizonDays}) so you only buy what you can realistically
                    sell that fast. Want to decide the amounts yourself? Use the{" "}
                    <span className="font-medium">Sales / day</span> column in the list below to
                    judge how quickly each item moves.
                  </span>
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="text-sm">
              projected <span className="font-semibold text-[#e8c170]">{gil(plan.totalGil)}</span>
              {plan.leftover > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({plan.leftover.toLocaleString()} left over)
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {plan.allocations.map((a) => (
              <div key={a.row.itemId} className="flex items-center gap-2 text-sm">
                <ItemIcon icon={a.row.icon} size={20} />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium tabular-nums">{a.itemsBought.toLocaleString()}×</span>{" "}
                  {a.row.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {a.spent.toLocaleString()} {activeCurrency.name} → {gil(a.gil)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Capped to ~{config.budgetSellHorizonDays} days of sales per item, so the list is
            something you can actually move.
            {plan.leftover > 0 &&
              ` ${plan.leftover.toLocaleString()} ${activeCurrency.name} left unspent — not enough demand to sell more this fast.`}
          </p>
        </div>
      )}

      {/* Results */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-sm">
        {data.status === "loading" && (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Pricing items on {homeWorldName}…
          </div>
        )}
        {data.status === "error" && (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-destructive">
            Couldn't fetch prices.<br />
            <span className="text-xs text-muted-foreground">{data.error}</span>
          </div>
        )}
        {data.status === "ready" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium" title="Current lowest listing — click to copy">
                    Min price
                  </th>
                  <th className="px-3 py-2 text-right font-medium" title="Recent average sale price — click to copy">
                    Avg price
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Gil / currency</th>
                  <th className="px-3 py-2 text-right font-medium">Sales / day</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.itemId} className="border-b border-border/50 hover:bg-accent/40">
                    <td className="px-3 py-1.5">
                      <ItemLabel name={r.name} icon={r.icon} marketable copyOnClick />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {r.costQty}
                      {r.receiveQty > 1 ? ` → ${r.receiveQty}` : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <CopyPrice value={r.minPrice} />
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      <CopyPrice value={r.avgSalePrice} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums text-[#e8c170]">
                      {perCurrency(r.gilPerCurrency)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {r.salesPerDay !== null ? r.salesPerDay.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      {rows.length === 0
                        ? "No items found to buy with this currency."
                        : "All items are below the sales/day filter — turn off “Hide rarely sold” to see them."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    );
  }

  return (
    <>
      {body}
      <CurrencySelectDialog open={selectOpen} onClose={() => setSelectOpen(false)} />
    </>
  );
}
