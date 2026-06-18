// Settings popover (SPEC §11): "Clear icon cache" action + app/data info.
// Plain panel + backdrop (no portalled dialog) to match BasketMenu and stay click-safe.

import { useState } from "react";
import { Settings as SettingsIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { clearIconCache } from "@/lib/iconCache";
import { useItems } from "@/state/ItemsProvider";

export function SettingsDialog() {
  const { version } = useItems();
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  async function handleClear() {
    setClearing(true);
    await clearIconCache();
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={() => setOpen((o) => !o)}>
        <SettingsIcon className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 space-y-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">Icon cache</div>
                <div className="text-[11px] text-muted-foreground">
                  Re-downloads as needed.
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClear} disabled={clearing}>
                <Trash2 className="size-3.5" />
                {cleared ? "Cleared" : clearing ? "…" : "Clear"}
              </Button>
            </div>

            <div className="space-y-1 rounded-lg border p-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>App version</span>
                <span className="tabular-nums text-foreground">{config.appVersion}</span>
              </div>
              <div className="flex justify-between">
                <span>Item data</span>
                <span className="tabular-nums text-foreground">{version ?? "—"}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
