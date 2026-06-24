// Settings popover (SPEC §11): app/data info. Plain panel + backdrop (no portalled dialog)
// to match BasketMenu and stay click-safe.
//
// Icons are loaded as native <img> and cached by the webview automatically (XIVAPI sends a
// 1-year Cache-Control), so there's no separate icon cache to clear.

import { useState } from "react";
import { Coins, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { useItems } from "@/state/ItemsProvider";
import { useSettings } from "@/state/SettingsProvider";
import { CurrencySelectDialog } from "@/components/CurrencySelectDialog";

export function SettingsDialog() {
  const { version } = useItems();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="icon-sm" aria-label="Settings" onClick={() => setOpen((o) => !o)}>
        <SettingsIcon className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-64 space-y-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setCurrencyOpen(true);
                setOpen(false);
              }}
            >
              <Coins className="size-3.5" />
              Select currencies
              {settings.selectedCurrencies.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {settings.selectedCurrencies.length}
                </span>
              )}
            </Button>
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
            <p className="px-1 text-[10px] text-muted-foreground">
              Prices: Universalis · Icons: XIVAPI · © Square Enix
            </p>
          </div>
        </>
      )}

      <CurrencySelectDialog open={currencyOpen} onClose={() => setCurrencyOpen(false)} />
    </div>
  );
}
