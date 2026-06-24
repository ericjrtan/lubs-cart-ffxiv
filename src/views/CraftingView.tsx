// Crafting tool (SPEC v1.1 §4): craft-vs-buy savings. Placeholder shell for A1 — the
// recipe fetch, pricing, and breakdown land in milestones B1–B3.

import { Hammer } from "lucide-react";

export function CraftingView() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/40 p-8 text-center">
        <Hammer className="size-8 text-muted-foreground" />
        <h2 className="text-base font-medium">Crafting — coming in v1.1</h2>
        <p className="text-sm text-muted-foreground">
          Pick a craftable item to compare buying its components across your data center
          against buying it outright — with the % you'd save and the profit if you craft and
          sell on your home world.
        </p>
      </div>
    </div>
  );
}
