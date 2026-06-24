// Cart-specific action bar (SPEC v1.1 §3.2): the controls that only the Cart tool uses —
// saved baskets, the cheapest-buy strategy toggle + savings-tolerance slider, and Generate.
// Global settings (Home DC, travel) live in GlobalHeader.

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { Strategy } from "@/lib/types";
import type { BasketItem } from "@/hooks/useBasket";
import { BasketMenu } from "@/components/BasketMenu";

interface CartActionBarProps {
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

export function CartActionBar({
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
}: CartActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <BasketMenu items={basketItems} onLoad={onLoadBasket} />

      <div className="flex flex-wrap items-center gap-4">
        <StrategyToggle value={strategy} onChange={onStrategyChange} />

        {strategy === "fewest-stops" && (
          <ToleranceSlider value={tolerance} onChange={onToleranceChange} />
        )}

        <Button
          className={`font-semibold ${dirty && !generating ? "ring-2 ring-amber-400/60" : ""}`}
          disabled={!canGenerate || generating}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : dirty ? "Regenerate" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
