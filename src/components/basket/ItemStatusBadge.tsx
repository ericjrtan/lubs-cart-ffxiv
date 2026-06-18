import { Badge } from "@/components/ui/badge";
import type { ResolveStatus } from "@/lib/items";

const LABELS: Record<ResolveStatus, string> = {
  matched: "Matched",
  suggested: "Did you mean…",
  unmatched: "No match",
  "non-marketable": "Not on market board",
};

const VARIANTS: Record<ResolveStatus, "secondary" | "outline" | "destructive"> = {
  matched: "secondary",
  suggested: "outline",
  unmatched: "destructive",
  "non-marketable": "outline",
};

/** Status badge shown on every basket row (SPEC §6 / §9). */
export function ItemStatusBadge({ status }: { status: ResolveStatus }) {
  // Tint matched green and non-marketable amber on top of the base variants.
  const tint =
    status === "matched"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : status === "non-marketable"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "";
  return (
    <Badge variant={VARIANTS[status]} className={tint}>
      {LABELS[status]}
    </Badge>
  );
}
