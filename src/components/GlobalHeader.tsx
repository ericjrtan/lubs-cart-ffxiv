// Global app header (SPEC v1.1 §3.2): logo + tab strip + the settings that every tool
// shares — Home DC, regional travel, the reachable-set badge, and the data-freshness chip.
// Tool-specific controls (cart strategy/Generate, etc.) live in each view's own action bar.

import { useMemo } from "react";
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
import type { DataCenter } from "@/lib/types";
import { useAppData } from "@/state/AppDataProvider";
import { useSettings } from "@/state/SettingsProvider";
import { getReachableDcs, getReachableWorldIds } from "@/lib/reachability";
import { relativeTime } from "@/lib/time";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TabBar } from "@/components/TabBar";
import { Logo } from "@/components/Logo";

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

export function GlobalHeader() {
  const { dataCenters, status } = useAppData();
  const { settings, setHomeDc, setTravel, setActiveTab } = useSettings();
  const { homeDc, travelAllowed, activeTab } = settings;
  const groups = useMemo(() => groupByRegion(dataCenters), [dataCenters]);

  const reachableDcs = useMemo(
    () => (homeDc ? getReachableDcs(homeDc, dataCenters, travelAllowed) : []),
    [homeDc, dataCenters, travelAllowed],
  );
  const reachableWorldCount = useMemo(
    () => getReachableWorldIds(reachableDcs).length,
    [reachableDcs],
  );

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Logo size={24} className="drop-shadow-[0_0_7px_rgba(255,138,76,0.45)]" />
          <h1 className="bg-gradient-to-b from-[#ffd2a6] to-[#ff8a4c] bg-clip-text text-lg font-semibold tracking-tight text-transparent">
            Lub's Cart
          </h1>
        </div>
        <TabBar value={activeTab} onChange={setActiveTab} />
        <SettingsDialog />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="home-dc" className="text-xs text-muted-foreground">
            Home DC
          </Label>
          <Select value={homeDc} onValueChange={(v) => setHomeDc(v as string)}>
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
          <Switch id="travel" checked={travelAllowed} onCheckedChange={(c) => setTravel(c)} />
          <Label htmlFor="travel" className="text-xs text-muted-foreground">
            Regional travel
          </Label>
        </div>

        {homeDc && reachableWorldCount > 0 && (
          <Badge variant="outline" className="font-normal">
            {reachableWorldCount} worlds · {reachableDcs.length} DC{reachableDcs.length === 1 ? "" : "s"}
          </Badge>
        )}

        <FreshnessChip />
      </div>
    </header>
  );
}
