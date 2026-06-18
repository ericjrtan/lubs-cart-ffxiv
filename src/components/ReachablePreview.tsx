// Temporary data-layer visualization for Milestone 2: shows which DCs/worlds the current
// home-DC + travel selection can reach (SPEC §4). Milestone 6 replaces this pane with the
// real DC → World purchase results.

import type { DataCenter, World } from "@/lib/types";

interface ReachablePreviewProps {
  homeDc: string | null;
  reachableDcs: DataCenter[];
  worldsById: Map<number, World>;
}

export function ReachablePreview({ homeDc, reachableDcs, worldsById }: ReachablePreviewProps) {
  if (!homeDc) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Pick a home data center to see reachable worlds
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Reachable markets for <span className="text-foreground">{homeDc}</span> — these are
        the worlds Lub's Cart will price against when you Generate.
      </p>
      {reachableDcs.map((dc) => (
        <div key={dc.name} className="rounded-lg bg-muted/40 p-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-medium">{dc.name}</span>
            <span className="text-[11px] text-muted-foreground">{dc.region}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dc.worlds.map((id) => (
              <span
                key={id}
                className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground ring-1 ring-border"
              >
                {worldsById.get(id)?.name ?? `#${id}`}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
