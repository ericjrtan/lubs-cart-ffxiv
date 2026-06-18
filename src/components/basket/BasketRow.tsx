import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemLabel } from "@/components/ItemLabel";
import { QtyStepper } from "@/components/QtyStepper";
import { ItemStatusBadge } from "@/components/basket/ItemStatusBadge";
import type { BasketItem } from "@/hooks/useBasket";

interface BasketRowProps {
  item: BasketItem;
  cheapest?: { pricePerUnit: number; worldName: string } | null;
  onSetQty: (key: string, qty: number) => void;
  onToggleHq: (key: string) => void;
  onRemove: (key: string) => void;
  onAcceptSuggestion: (key: string) => void;
}

export function BasketRow({
  item,
  cheapest,
  onSetQty,
  onToggleHq,
  onRemove,
  onAcceptSuggestion,
}: BasketRowProps) {
  const displayName = item.resolvedName ?? item.rawName;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/40 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ItemLabel
            name={displayName}
            icon={item.icon}
            iconSize={28}
            marketable={item.status !== "non-marketable"}
            typed={item.rawName}
            cheapest={cheapest}
            className="text-sm font-medium"
          />
          <ItemStatusBadge status={item.status} />
        </div>

        {item.status === "suggested" && item.suggestion && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Did you mean{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              onClick={() => onAcceptSuggestion(item.key)}
            >
              {item.suggestion}
            </button>
            ?
          </div>
        )}

        {item.status === "non-marketable" && (
          <div className="mt-0.5 text-[11px] text-amber-400/80">
            Vendor/quest item — get it elsewhere (not priced)
          </div>
        )}

        {item.status === "unmatched" && (
          <div className="mt-0.5 text-[11px] text-destructive/80">
            No item found — check the spelling
          </div>
        )}
      </div>

      {/* HQ toggle — only meaningful for marketable items */}
      {item.status === "matched" && (
        <Button
          type="button"
          variant={item.hqOnly ? "default" : "outline"}
          size="xs"
          className="font-semibold"
          onClick={() => onToggleHq(item.key)}
          title="Require high quality"
        >
          HQ
        </Button>
      )}

      <QtyStepper value={item.qty} onChange={(q) => onSetQty(item.key, q)} />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(item.key)}
        aria-label={`Remove ${displayName}`}
      >
        <X />
      </Button>
    </div>
  );
}
