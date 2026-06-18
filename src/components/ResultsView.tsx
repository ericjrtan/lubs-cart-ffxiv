// Cheapest-buy results UI (SPEC §9). Sticky summary header (grand total pre-tax + with
// tax, coverage, warnings), then collapsible DC → World sections. Each world card lists
// its purchase lines (item, qty, unit price, line total, overbuy badge) with a per-world
// subtotal and a "Copy list" button for ticking off while travelling.

import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { CopyButton } from "@/components/CopyButton";
import { ItemLabel } from "@/components/ItemLabel";
import { config } from "@/config";
import { gil, mergeLinesByItem, spreadText, worldListText } from "@/lib/format";
import { relativeTime } from "@/lib/time";
import type { DcGroup, Result, WorldGroup } from "@/lib/types";

const STRATEGY_LABEL = {
  "lowest-gil": "Lowest gil",
  "fewest-stops": "Fewest stops",
} as const;

const isStale = (uploadTime: number | undefined, now: number) =>
  uploadTime !== undefined && now - uploadTime > config.staleDataThresholdMs;

function WorldCard({ world, now }: { world: WorldGroup; now: number }) {
  return (
    <div className="rounded-lg bg-background/40 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{world.world}</span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[11px] text-muted-foreground">
            {gil(world.subtotalPreTax + world.subtotalTax)}
          </span>
          <CopyButton getText={() => worldListText(world)} label="Copy list" title="Copy this world's list" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {mergeLinesByItem(world.lines).map((r) => (
          <div key={r.itemId} className="text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-center text-foreground">
                <ItemLabel name={r.itemName} icon={r.itemIcon} hq={r.allHq} marketable copyOnClick />
                {r.overbuyQty ? (
                  <Badge
                    variant="outline"
                    className="ml-1.5 border-amber-500/30 bg-amber-500/10 px-1 py-0 text-[10px] font-normal text-amber-400"
                  >
                    +{r.overbuyQty} extra
                  </Badge>
                ) : null}
              </div>
              <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-muted-foreground">×{r.totalQty}</span>
                <span className="text-foreground">{gil(r.totalPreTax + r.totalTax)}</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {spreadText(r.stacks)}
              {isStale(r.uploadTime, now) && (
                <span className="ml-1.5 text-amber-400/90">· ⚠ updated {relativeTime(r.uploadTime!, now)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DcSection({ dc, now }: { dc: DcGroup; now: number }) {
  return (
    <CollapsibleSection
      title={<span className="text-sm font-semibold">{dc.dc}</span>}
      right={
        <span className="pr-1 text-xs text-muted-foreground">
          {gil(dc.subtotalPreTax + dc.subtotalTax)}
        </span>
      }
    >
      {dc.worlds.map((w) => (
        <WorldCard key={w.world} world={w} now={now} />
      ))}
    </CollapsibleSection>
  );
}

export function ResultsView({ result }: { result: Result }) {
  const now = Date.now();
  const filled = result.itemOutcomes.filter((o) => o.filled).length;
  const total = result.itemOutcomes.length;
  const withTax = result.grandTotalPreTax + result.grandTotalTax;
  const staleCount = result.byDc.reduce(
    (n, dc) =>
      n +
      dc.worlds.reduce(
        (m, w) => m + mergeLinesByItem(w.lines).filter((r) => isStale(r.uploadTime, now)).length,
        0,
      ),
    0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky summary header */}
      <div className="mb-3 rounded-xl border bg-card/95 p-3 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">
              Grand total · {STRATEGY_LABEL[result.strategy]}
            </div>
            <div className="text-2xl font-bold text-[#e8c170]">{gil(withTax)}</div>
            <div className="text-xs text-muted-foreground">
              {gil(result.grandTotalPreTax)} pre-tax + {gil(result.grandTotalTax)} tax
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={filled === total ? "secondary" : "destructive"} className="font-normal">
              {filled}/{total} items sourced
            </Badge>
            {result.byDc.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {result.byDc.length} DC{result.byDc.length === 1 ? "" : "s"} ·{" "}
                {result.byDc.reduce((s, d) => s + d.worlds.length, 0)} worlds
              </span>
            )}
            {staleCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 font-normal text-amber-400"
              >
                {staleCount} stale price{staleCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {/* Warnings */}
        {result.warnings.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
            {result.warnings.map((w, i) => (
              <li key={i}>⚠ {w}</li>
            ))}
          </ul>
        )}

        {/* DC → World breakdown, with a staggered reveal */}
        {result.byDc.map((dc, i) => (
          <div
            key={dc.dc}
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <DcSection dc={dc} now={now} />
          </div>
        ))}

        {result.byDc.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Nothing to buy — no listings found for the basket on reachable worlds.
          </div>
        )}
      </div>
    </div>
  );
}
