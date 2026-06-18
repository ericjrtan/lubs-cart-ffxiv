// Left pane: the basket builder (SPEC §9). Paste box + manual autocomplete add + the
// editable basket list with status badges and running totals.

import { PasteBox } from "@/components/basket/PasteBox";
import { ManualAdd } from "@/components/basket/ManualAdd";
import { BasketList } from "@/components/basket/BasketList";
import { useItems } from "@/state/ItemsProvider";
import type { useBasket } from "@/hooks/useBasket";

type BasketApi = ReturnType<typeof useBasket>;

interface BasketPaneProps {
  basket: BasketApi;
  cheapestByItem?: Map<number, { pricePerUnit: number; worldName: string }>;
}

export function BasketPane({ basket, cheapestByItem }: BasketPaneProps) {
  const { resolver, status, error } = useItems();
  const notReady = status !== "ready";

  return (
    <section className="flex min-h-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Basket</h2>

      {status === "error" ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          Couldn't load the item table (items.json){error ? `: ${error}` : ""}.
        </div>
      ) : null}

      <PasteBox disabled={notReady} onAdd={basket.addRawText} />
      <ManualAdd resolver={resolver} disabled={notReady} onAdd={basket.addEntry} />

      <div className="h-px bg-border" />

      <BasketList
        items={basket.items}
        stats={basket.stats}
        cheapestByItem={cheapestByItem}
        onSetQty={basket.setQty}
        onToggleHq={basket.toggleHq}
        onRemove={basket.remove}
        onAcceptSuggestion={basket.acceptSuggestion}
        onClear={basket.clear}
      />
    </section>
  );
}
