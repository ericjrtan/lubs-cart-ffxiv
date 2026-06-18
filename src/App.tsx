import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/TopBar";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ReachablePreview } from "@/components/ReachablePreview";
import { ResultsView } from "@/components/ResultsView";
import { BasketPane } from "@/components/basket/BasketPane";
import { useAppData } from "@/state/AppDataProvider";
import { useItems } from "@/state/ItemsProvider";
import { useSettings } from "@/state/SettingsProvider";
import { useBasket } from "@/hooks/useBasket";
import { useMarketFetch } from "@/hooks/useMarketFetch";
import { getReachableDcs, getReachableWorldIds } from "@/lib/reachability";
import { buildWorldToDc, computeResult, type PriceableItem } from "@/lib/cheapest";

/**
 * Milestone 5: cheapest-buy algorithms wired in.
 * Generate fetches market data once; the result is recomputed (no refetch) whenever the
 * strategy toggles or quantities change. Milestone 6 polishes the results UI.
 */
function App() {
  const { dataCenters, worldsById, status, error } = useAppData();
  const { resolver } = useItems();
  const basket = useBasket(resolver);
  const market = useMarketFetch();

  const { settings, setHomeDc, setTravel, setStrategy, setTolerance } = useSettings();
  const { homeDc, travelAllowed, strategy, tolerance } = settings;

  const reachableDcs = useMemo(
    () => (homeDc ? getReachableDcs(homeDc, dataCenters, travelAllowed) : []),
    [homeDc, dataCenters, travelAllowed],
  );
  const reachableWorldCount = useMemo(
    () => getReachableWorldIds(reachableDcs).length,
    [reachableDcs],
  );
  // Group results against the reachable set captured at Generate time (not the live one),
  // so toggling travel/DC afterward never mislabels worlds — it just means "regenerate".
  const worldToDc = useMemo(
    () => buildWorldToDc(market.reachableDcs, worldsById),
    [market.reachableDcs, worldsById],
  );

  // Priceable = resolved + marketable; non-marketable items get a "get elsewhere" warning.
  const priceableItems = useMemo<PriceableItem[]>(
    () =>
      basket.items
        .filter((it) => it.status === "matched" && it.resolvedId != null)
        .map((it) => ({
          itemId: it.resolvedId!,
          itemName: it.resolvedName ?? it.rawName,
          icon: it.icon,
          qty: it.qty,
          hqOnly: it.hqOnly,
        })),
    [basket.items],
  );
  const nonMarketableNames = useMemo(
    () =>
      basket.items
        .filter((it) => it.status === "non-marketable")
        .map((it) => it.resolvedName ?? it.rawName),
    [basket.items],
  );

  const result = useMemo(
    () =>
      market.data
        ? computeResult({
            items: priceableItems,
            market: market.data,
            worldToDc,
            strategy,
            tolerance,
            nonMarketableNames,
          })
        : null,
    [market.data, priceableItems, worldToDc, strategy, tolerance, nonMarketableNames],
  );

  // Signature of the inputs that require a refetch (home DC, travel, which items — but not
  // quantity/strategy/tolerance, which recompute live). Used to prompt "Generate again".
  const currentSig = useMemo(
    () =>
      `${homeDc}|${travelAllowed}|${priceableItems
        .map((it) => it.itemId)
        .sort((a, b) => a - b)
        .join(",")}`,
    [homeDc, travelAllowed, priceableItems],
  );
  const [generatedSig, setGeneratedSig] = useState<string | null>(null);

  // Cheapest unit price + world per item from the last result, for basket hover cards.
  const cheapestByItem = useMemo(() => {
    const m = new Map<number, { pricePerUnit: number; worldName: string }>();
    if (!result) return m;
    for (const dc of result.byDc)
      for (const w of dc.worlds)
        for (const l of w.lines) {
          const cur = m.get(l.itemId);
          if (!cur || l.pricePerUnit < cur.pricePerUnit)
            m.set(l.itemId, { pricePerUnit: l.pricePerUnit, worldName: l.worldName });
        }
    return m;
  }, [result]);

  const handleGenerate = useCallback(() => {
    setGeneratedSig(currentSig);
    market.generate(
      reachableDcs,
      priceableItems.map((it) => it.itemId),
    );
  }, [market, reachableDcs, priceableItems, currentSig]);

  const canGenerate = homeDc !== null && reachableWorldCount > 0 && priceableItems.length > 0;
  // Results are showing but the fetch-affecting settings have since changed.
  const settingsChanged =
    market.status === "done" && generatedSig !== null && generatedSig !== currentSig;

  return (
    <div className="flex h-screen flex-col bg-background bg-[radial-gradient(125%_85%_at_50%_-15%,#3a1d22_0%,transparent_55%)] text-foreground">
      <UpdateBanner />
      <TopBar
        homeDc={homeDc}
        onHomeDcChange={setHomeDc}
        travelAllowed={travelAllowed}
        onTravelChange={setTravel}
        reachableDcCount={reachableDcs.length}
        reachableWorldCount={reachableWorldCount}
        strategy={strategy}
        onStrategyChange={setStrategy}
        tolerance={tolerance}
        onToleranceChange={setTolerance}
        canGenerate={canGenerate}
        generating={market.status === "loading"}
        onGenerate={handleGenerate}
        dirty={settingsChanged}
        basketItems={basket.items}
        onLoadBasket={basket.replaceAll}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(380px,2fr)_3fr]">
        {/* Left — basket builder */}
        <BasketPane basket={basket} cheapestByItem={cheapestByItem} />

        {/* Right — results */}
        <section className="flex min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            {market.status === "idle" ? "Reachable worlds" : "Results"}
          </h2>
          {settingsChanged && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
              <span>
                Home DC / regional travel changed — these results are out of date.
              </span>
              <Button size="xs" variant="outline" onClick={handleGenerate} disabled={!canGenerate}>
                Generate again
              </Button>
            </div>
          )}
          <RightPane
            market={market}
            result={result}
            homeDc={homeDc}
            reachableDcs={reachableDcs}
            worldsById={worldsById}
            dataStatus={status}
            dataError={error}
          />
        </section>
      </main>

      <footer className="border-t px-5 py-2 text-center text-[11px] text-muted-foreground">
        Unofficial. Not affiliated with or endorsed by Square Enix. FINAL FANTASY XIV ©
        SQUARE ENIX CO., LTD.
      </footer>
    </div>
  );
}

type RightPaneProps = {
  market: ReturnType<typeof useMarketFetch>;
  result: ReturnType<typeof computeResult> | null;
  homeDc: string | null;
  reachableDcs: ReturnType<typeof getReachableDcs>;
  worldsById: ReturnType<typeof useAppData>["worldsById"];
  dataStatus: ReturnType<typeof useAppData>["status"];
  dataError: string | null;
};

function RightPane({
  market,
  result,
  homeDc,
  reachableDcs,
  worldsById,
  dataStatus,
  dataError,
}: RightPaneProps) {
  if (dataStatus === "error") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm text-destructive">
        Couldn't load data centers/worlds from Universalis.
        {dataError ? <br /> : null}
        {dataError && <span className="text-xs text-muted-foreground">{dataError}</span>}
      </div>
    );
  }

  if (market.status === "loading") {
    const { done, total } = market.progress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <span>Fetching prices… {total > 0 ? `${done}/${total} requests` : ""}</span>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (market.status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm text-destructive">
        Couldn't fetch prices.
        <br />
        <span className="text-xs text-muted-foreground">{market.error}</span>
      </div>
    );
  }

  if (market.status === "done" && result) {
    return <ResultsView result={result} />;
  }

  // idle
  return <ReachablePreview homeDc={homeDc} reachableDcs={reachableDcs} worldsById={worldsById} />;
}

export default App;
