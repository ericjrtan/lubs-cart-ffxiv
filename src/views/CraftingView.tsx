// Crafting tool (SPEC v1.1 §4): pick a craftable item → compare buying its ingredients
// (cheapest across the reachable DC, via the cart engine) against buying it outright, and
// against crafting it to sell on your home world. Recipes are fetched lazily from XIVAPI v2.

import { useEffect, useMemo, useState } from "react";
import { Hammer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ItemIcon } from "@/components/ItemIcon";
import { ItemLabel } from "@/components/ItemLabel";
import { QtyStepper } from "@/components/QtyStepper";
import { ResultsView } from "@/components/ResultsView";
import { useItems } from "@/state/ItemsProvider";
import { useSettings } from "@/state/SettingsProvider";
import { useAppData } from "@/state/AppDataProvider";
import { getReachableDcs } from "@/lib/reachability";
import { buildWorldToDc } from "@/lib/cheapest";
import { fetchMarketForBasket } from "@/lib/market";
import { fetchAggregatedForWorld } from "@/lib/aggregated";
import { getRecipe } from "@/lib/recipes";
import { analyzeCraft, type CraftAnalysis } from "@/lib/profit";
import { gil } from "@/lib/format";
import type { ItemEntry } from "@/lib/items";
import type { AggregatedPrice, DataCenter, MarketData, Recipe } from "@/lib/types";

type CraftData =
  | { status: "idle" | "loading" | "not-craftable" }
  | { status: "error"; error: string }
  | { status: "ready"; recipe: Recipe; market: MarketData; homeAgg: AggregatedPrice | undefined };

/** Fetch recipe + market + home-world price for the picked item (re-runs only on real inputs). */
function useCraftData(
  item: ItemEntry | null,
  reachableDcs: DataCenter[],
  homeWorld: number | null,
): CraftData {
  const [state, setState] = useState<CraftData>({ status: "idle" });

  useEffect(() => {
    if (!item || reachableDcs.length === 0) {
      setState({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      const recipe = await getRecipe(item.id, ctrl.signal);
      if (cancelled) return;
      if (!recipe) {
        setState({ status: "not-craftable" });
        return;
      }
      const itemIds = [item.id, ...recipe.ingredients.map((i) => i.itemId)];
      const market = await fetchMarketForBasket({ reachableDcs, itemIds, signal: ctrl.signal });
      let homeAgg: AggregatedPrice | undefined;
      if (homeWorld !== null) {
        const m = await fetchAggregatedForWorld({ worldId: homeWorld, itemIds: [item.id], signal: ctrl.signal });
        homeAgg = m.get(item.id);
      }
      if (!cancelled) setState({ status: "ready", recipe, market, homeAgg });
    })().catch((e: unknown) => {
      if (!cancelled) setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [item, reachableDcs, homeWorld]);

  return state;
}

/** A labelled gil figure for the summary card. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? "text-[#e8c170]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export function CraftingView() {
  const { resolver, status: itemsStatus } = useItems();
  const { settings } = useSettings();
  const { dataCenters, worldsById } = useAppData();
  const { homeDc, travelAllowed, homeWorld } = settings;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ItemEntry | null>(null);
  const [craftQty, setCraftQty] = useState(1);

  const results = useMemo(
    () => (resolver && open && query.trim() ? resolver.search(query, 8) : []),
    [resolver, open, query],
  );

  const reachableDcs = useMemo(
    () => (homeDc ? getReachableDcs(homeDc, dataCenters, travelAllowed) : []),
    [homeDc, dataCenters, travelAllowed],
  );
  const worldToDc = useMemo(() => buildWorldToDc(reachableDcs, worldsById), [reachableDcs, worldsById]);
  const homeWorldName = homeWorld !== null ? (worldsById.get(homeWorld)?.name ?? null) : null;

  const data = useCraftData(item, reachableDcs, homeWorld);
  const analysis = useMemo<CraftAnalysis | null>(
    () =>
      data.status === "ready" && item
        ? analyzeCraft({
            recipe: data.recipe,
            finished: { name: item.name, icon: item.icon },
            craftQty,
            market: data.market,
            worldToDc,
            homeWorldPrice: data.homeAgg,
          })
        : null,
    [data, item, craftQty, worldToDc],
  );

  function pick(entry: ItemEntry) {
    setItem(entry);
    setQuery(entry.name);
    setOpen(false);
    setCraftQty(1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-md">
          <Input
            value={query}
            disabled={itemsStatus !== "ready"}
            placeholder={itemsStatus !== "ready" ? "Loading items…" : "Search a craftable item…"}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            className="h-9"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
              {results.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(entry);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
                  >
                    <ItemIcon icon={entry.icon} size={20} />
                    <span className="flex-1 truncate">{entry.name}</span>
                    {!entry.marketable && <span className="text-[10px] text-amber-400/80">vendor</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {item && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Craft</span>
            <QtyStepper value={craftQty} onChange={setCraftQty} />
          </div>
        )}
      </div>

      {/* Body */}
      {!homeDc ? (
        <Placeholder>Select your Home DC in the header to price ingredients.</Placeholder>
      ) : !item ? (
        <Placeholder icon>
          Search a craftable item above to compare crafting it vs. buying it — and the profit
          if you craft and sell on your home world.
        </Placeholder>
      ) : data.status === "loading" ? (
        <Placeholder>Looking up recipe &amp; prices…</Placeholder>
      ) : data.status === "not-craftable" ? (
        <Placeholder>
          <span className="font-medium">{item.name}</span> isn&apos;t craftable (no recipe). Try
          another item.
        </Placeholder>
      ) : data.status === "error" ? (
        <Placeholder error>Couldn&apos;t load prices. {data.error}</Placeholder>
      ) : data.status === "ready" && analysis ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Header: the item + recipe yield */}
          <div className="flex items-center gap-2">
            <ItemLabel name={item.name} icon={item.icon} marketable={item.marketable} />
            <span className="text-xs text-muted-foreground">
              · yields {data.recipe.resultQty} per craft · {analysis.finishedQty} total
            </span>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Craft cost (ingredients)" value={gil(analysis.craftCost)} />
            <Stat label="Buy cost (finished)" value={analysis.buyCost !== null ? gil(analysis.buyCost) : "—"} />
            <Stat
              label="Saving by crafting"
              value={analysis.savingsPct !== null ? `${Math.round(analysis.savingsPct * 100)}%` : "—"}
              accent={analysis.savingsPct !== null && analysis.savingsPct > 0}
            />
            <Stat
              label={homeWorldName ? `Craft & sell on ${homeWorldName}` : "Craft & sell profit"}
              value={analysis.craftAndSellProfit !== null ? gil(analysis.craftAndSellProfit) : "—"}
              accent={analysis.craftAndSellProfit !== null && analysis.craftAndSellProfit > 0}
            />
          </div>
          {homeWorld === null && (
            <p className="text-xs text-muted-foreground">
              Set your Home World in the header to see craft-and-sell profit.
            </p>
          )}
          {analysis.salesPerDay !== null && (
            <p className="text-xs text-muted-foreground">
              {item.name} sells ~{analysis.salesPerDay.toFixed(1)}/day on {homeWorldName}.
            </p>
          )}

          {/* Where to buy the ingredients — reuse the cart's breakdown */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Ingredients — cheapest across {reachableDcs.length} DC{reachableDcs.length === 1 ? "" : "s"}
            </h3>
            <ResultsView result={analysis.ingredients} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({
  children,
  icon,
  error,
}: {
  children: React.ReactNode;
  icon?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div
        className={`flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {icon && <Hammer className="size-8 text-muted-foreground" />}
        <p>{children}</p>
      </div>
    </div>
  );
}
