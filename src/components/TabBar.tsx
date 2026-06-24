// Top-level tab strip (SPEC v1.1 §3.1): Cart · Crafting · Currency. A simple segmented
// control styled to match the cart's StrategyToggle, so the three tools share one look.

import { Button } from "@/components/ui/button";
import type { AppTab } from "@/lib/types";

const TABS: Array<{ key: AppTab; label: string }> = [
  { key: "cart", label: "Cart" },
  { key: "crafting", label: "Crafting" },
  { key: "currency", label: "Currency" },
];

export function TabBar({ value, onChange }: { value: AppTab; onChange: (t: AppTab) => void }) {
  return (
    <div className="flex items-center rounded-lg border p-0.5">
      {TABS.map((t) => (
        <Button
          key={t.key}
          type="button"
          size="sm"
          variant={value === t.key ? "secondary" : "ghost"}
          className="font-medium"
          aria-current={value === t.key ? "page" : undefined}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
