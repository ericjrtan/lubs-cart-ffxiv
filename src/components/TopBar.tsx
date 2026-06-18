// App top bar (SPEC §9): home-DC dropdown, regional-travel toggle, a reachable-worlds
// summary, a data-freshness chip, and the Generate button. The strategy toggle and
// save/load basket controls land in later milestones.

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { DataCenter, Strategy } from "@/lib/types";
import type { BasketItem } from "@/hooks/useBasket";
import { useAppData } from "@/state/AppDataProvider";
import { relativeTime } from "@/lib/time";
import { BasketMenu } from "@/components/BasketMenu";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Logo } from "@/components/Logo";

interface TopBarProps {
  homeDc: string | null;
  onHomeDcChange: (dc: string) => void;
  travelAllowed: boolean;
  onTravelChange: (allowed: boolean) => void;
  reachableDcCount: number;
  reachableWorldCount: number;
  strategy: Strategy;
  onStrategyChange: (s: Strategy) => void;
  /** Fewest-stops savings tolerance as a fraction (0.1 = 10%). */
  tolerance: number;
  onToleranceChange: (t: number) => void;
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
  /** Results are showing but DC/travel/items changed since — nudge a regenerate. */
  dirty: boolean;
  basketItems: BasketItem[];
  onLoadBasket: (items: BasketItem[]) => void;
}

/** Slider: how much extra per item you'll pay to single-source it (Fewest-stops only). */
function ToleranceSlider({ value, onChange }: { value: number; onChange: (t: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Label className="whitespace-nowrap text-xs text-muted-foreground">
          Stay-on-one-world bias
        </Label>
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" aria-label="What does this do?" className="text-muted-foreground hover:text-foreground" />
            }
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <span className="text-xs leading-snug">
              How much extra gil you'll accept to buy an item from a single world instead of
              hopping between worlds to chase the lowest price. At {pct}%, an item stays on
              one world unless splitting it across worlds would save you more than {pct}%.
              0% = always cheapest (more world-hopping); higher = fewer stops (sometimes a
              little more gil).
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="w-28">
        <Slider
          value={[pct]}
          min={0}
          max={50}
          step={5}
          onValueChange={(v) => onChange((Array.isArray(v) ? v[0] : v) / 100)}
          className="w-full"
        />
      </div>
      <span className="w-9 text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/** Two-button segmented control for the cheapest-buy strategy (SPEC §7 / §9). */
function StrategyToggle({ value, onChange }: { value: Strategy; onChange: (s: Strategy) => void }) {
  const opts: Array<{ key: Strategy; label: string; hint: string }> = [
    { key: "lowest-gil", label: "Lowest gil", hint: "Cheapest total; may span worlds" },
    { key: "fewest-stops", label: "Fewest stops", hint: "Single cheapest world per item" },
  ];
  return (
    <div className="flex items-center rounded-lg border p-0.5">
      {opts.map((o) => (
        <Button
          key={o.key}
          type="button"
          size="xs"
          variant={value === o.key ? "secondary" : "ghost"}
          className="font-medium"
          title={o.hint}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

/** Group data centers by region so the dropdown is browsable for any region's players. */
function groupByRegion(dataCenters: DataCenter[]): Array<{ region: string; dcs: DataCenter[] }> {
  const order: string[] = [];
  const map = new Map<string, DataCenter[]>();
  for (const dc of dataCenters) {
    if (!map.has(dc.region)) {
      map.set(dc.region, []);
      order.push(dc.region);
    }
    map.get(dc.region)!.push(dc);
  }
  return order.map((region) => ({ region, dcs: map.get(region)! }));
}

function FreshnessChip() {
  const { status, fromCache, fetchedAt, error, reload } = useAppData();

  let label: string;
  let variant: "secondary" | "destructive" | "outline" = "secondary";
  if (status === "loading") {
    label = "Loading data…";
    variant = "outline";
  } else if (status === "error") {
    label = "Offline — no data";
    variant = "destructive";
  } else if (fromCache) {
    label = `Offline · cached ${fetchedAt ? relativeTime(fetchedAt) : ""}`.trim();
    variant = "destructive";
  } else {
    label = `Live · updated ${fetchedAt ? relativeTime(fetchedAt) : "now"}`;
    variant = "secondary";
  }

  return (
    <button
      type="button"
      onClick={reload}
      title={error ?? "Click to refresh data centers & worlds"}
      className="cursor-pointer"
    >
      <Badge variant={variant}>{label}</Badge>
    </button>
  );
}

export function TopBar({
  homeDc,
  onHomeDcChange,
  travelAllowed,
  onTravelChange,
  reachableDcCount,
  reachableWorldCount,
  strategy,
  onStrategyChange,
  tolerance,
  onToleranceChange,
  canGenerate,
  generating,
  onGenerate,
  dirty,
  basketItems,
  onLoadBasket,
}: TopBarProps) {
  const { dataCenters, status } = useAppData();
  const groups = useMemo(() => groupByRegion(dataCenters), [dataCenters]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
      <div className="flex items-center gap-2">
        <Logo size={24} className="drop-shadow-[0_0_7px_rgba(255,138,76,0.45)]" />
        <h1 className="bg-gradient-to-b from-[#ffd2a6] to-[#ff8a4c] bg-clip-text text-lg font-semibold tracking-tight text-transparent">
          Lub's Cart
        </h1>
        <BasketMenu items={basketItems} onLoad={onLoadBasket} />
        <SettingsDialog />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="home-dc" className="text-xs text-muted-foreground">
            Home DC
          </Label>
          <Select value={homeDc} onValueChange={(v) => onHomeDcChange(v as string)}>
            <SelectTrigger id="home-dc" className="w-48" disabled={status !== "ready"}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectGroup key={g.region}>
                  <SelectLabel>{g.region}</SelectLabel>
                  {g.dcs.map((dc) => (
                    <SelectItem key={dc.name} value={dc.name}>
                      {dc.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="travel"
            checked={travelAllowed}
            onCheckedChange={(c) => onTravelChange(c)}
          />
          <Label htmlFor="travel" className="text-xs text-muted-foreground">
            Regional travel
          </Label>
        </div>

        <StrategyToggle value={strategy} onChange={onStrategyChange} />

        {strategy === "fewest-stops" && (
          <ToleranceSlider value={tolerance} onChange={onToleranceChange} />
        )}

        {homeDc && reachableWorldCount > 0 && (
          <Badge variant="outline" className="font-normal">
            {reachableWorldCount} worlds · {reachableDcCount} DC{reachableDcCount === 1 ? "" : "s"}
          </Badge>
        )}

        <FreshnessChip />

        <Button
          className={`font-semibold ${dirty && !generating ? "ring-2 ring-amber-400/60" : ""}`}
          disabled={!canGenerate || generating}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : dirty ? "Regenerate" : "Generate"}
        </Button>
      </div>
    </header>
  );
}
