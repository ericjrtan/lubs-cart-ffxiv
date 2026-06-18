import { Button } from "@/components/ui/button";
import { BasketRow } from "@/components/basket/BasketRow";
import type { BasketItem, BasketStats } from "@/hooks/useBasket";

interface BasketListProps {
  items: BasketItem[];
  stats: BasketStats;
  cheapestByItem?: Map<number, { pricePerUnit: number; worldName: string }>;
  onSetQty: (key: string, qty: number) => void;
  onToggleHq: (key: string) => void;
  onRemove: (key: string) => void;
  onAcceptSuggestion: (key: string) => void;
  onClear: () => void;
}

export function BasketList({
  items,
  stats,
  cheapestByItem,
  onSetQty,
  onToggleHq,
  onRemove,
  onAcceptSuggestion,
  onClear,
}: BasketListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {stats.itemCount === 0
            ? "Empty"
            : `${stats.itemCount} item${stats.itemCount === 1 ? "" : "s"} · ${stats.totalUnits} unit${stats.totalUnits === 1 ? "" : "s"}`}
        </span>
        {items.length > 0 && (
          <Button variant="ghost" size="xs" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Paste a list or add items above
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <BasketRow
              key={item.key}
              item={item}
              cheapest={item.resolvedId != null ? cheapestByItem?.get(item.resolvedId) : undefined}
              onSetQty={onSetQty}
              onToggleHq={onToggleHq}
              onRemove={onRemove}
              onAcceptSuggestion={onAcceptSuggestion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
