// Currency tool (SPEC v1.1 §5): best item to buy-and-flip per end-game currency. Placeholder
// shell for A1 — the currency picker, lazy exchange-list load, and home-world pricing land in
// milestones C0–C3. Nothing loads until a currency is picked.

import { Coins } from "lucide-react";

export function CurrencyView() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/40 p-8 text-center">
        <Coins className="size-8 text-muted-foreground" />
        <h2 className="text-base font-medium">Currency — coming in v1.1</h2>
        <p className="text-sm text-muted-foreground">
          Choose an end-game currency (Bicolor Gemstones, Tomestones, Scrips…) to see which
          items give the most gil per currency unit when sold on your home world, with sales
          per day and estimated profit.
        </p>
      </div>
    </div>
  );
}
